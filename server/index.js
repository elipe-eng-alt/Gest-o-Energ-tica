import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'energy-viva.db');

fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(cors());
app.use(express.json({ limit: '100kb' }));

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    document TEXT NOT NULL,
    sector TEXT NOT NULL,
    position TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('SQLite inicializado em:', dbPath);

const listCustomers = db.prepare(
  'SELECT id, name, company_name, email, phone, document, sector, position, created_at FROM customers ORDER BY created_at DESC',
);
const insertCustomer = db.prepare(
  'INSERT INTO customers (name, company_name, email, phone, document, sector, position, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);

const getOwnerEmail = () => process.env.OWNER_EMAIL || 'owner@empresa.com';
const hasSmtpCredentials = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = hasSmtpCredentials()
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendOwnerNotification(customer) {
  const ownerEmail = getOwnerEmail();

  if (!transporter) {
    console.log('Simulando envio de e-mail para o owner:');
    console.log({
      to: ownerEmail,
      subject: 'Novo cliente cadastrado',
      text: `Novo cadastro: ${customer.name} (${customer.company_name}) - ${customer.email}`,
    });
    return { simulated: true };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: ownerEmail,
    replyTo: customer.email,
    subject: 'Novo cliente cadastrado no EnergiaViva',
    text: [
      'Novo cadastro realizado no portal.',
      '',
      `Nome: ${customer.name}`,
      `Empresa: ${customer.company_name}`,
      `E-mail: ${customer.email}`,
      `Telefone: ${customer.phone}`,
      `Cargo: ${customer.position}`,
      `Setor: ${customer.sector}`,
    ].join('\n'),
  });

  return { simulated: false, messageId: info.messageId };
}

function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(503).json({ message: 'Defina ADMIN_TOKEN no .env para habilitar esta rota.' });
  }

  if (req.get('authorization') !== `Bearer ${token}`) {
    return res.status(401).json({ message: 'Não autorizado.' });
  }

  next();
}

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API do EnergiaViva ativa.' });
});

app.get('/api/customers', requireAdmin, (req, res) => {
  try {
    res.json(listCustomers.all());
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro ao listar clientes.' });
  }
});

app.post('/api/customers', async (req, res) => {
  const body = req.body ?? {};
  const nome = asText(body.nome);
  const empresa = asText(body.empresa);
  const email = asText(body.email).toLowerCase();
  const telefone = asText(body.telefone);
  const document = asText(body.document).replace(/\D/g, '');
  const setor = asText(body.setor);
  const cargo = asText(body.cargo);
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (!nome || !empresa || !email || !telefone || !document || !setor || !cargo || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: 'Informe um e-mail válido.' });
  }

  if (document.length !== 11 && document.length !== 14) {
    return res.status(400).json({ message: 'CPF deve ter 11 dígitos e CNPJ 14 dígitos.' });
  }

  if (senha.length < 8) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  if (senha !== body.confirmarSenha) {
    return res.status(400).json({ message: 'As senhas não conferem.' });
  }

  try {
    const passwordHash = await bcrypt.hash(senha, 10);
    insertCustomer.run(nome, empresa, email, telefone, document, setor, cargo, passwordHash);
  } catch (error) {
    if (error?.code === 'ERR_SQLITE_ERROR' && String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ message: 'Este e-mail já foi cadastrado.' });
    }

    console.error('Erro no cadastro:', error);
    return res.status(500).json({ message: 'Erro ao salvar o cadastro.' });
  }

  const customer = { name: nome, company_name: empresa, email, phone: telefone, position: cargo, sector: setor };

  try {
    const notification = await sendOwnerNotification(customer);
    return res.status(201).json({
      message: 'Cadastro realizado com sucesso. Nossa equipe entrará em contato.',
      notification,
    });
  } catch (mailError) {
    console.error('Erro ao enviar e-mail:', mailError);
    return res.status(201).json({
      message: 'Cadastro realizado com sucesso, mas houve falha ao notificar a equipe.',
    });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Rota da API não encontrada.' });
});

const distPath = path.resolve(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  // Arquivos em /assets têm hash no nome, então podem ficar em cache indefinidamente.
  app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(distPath, { index: false }));

  // Express 5 não aceita mais '*' como rota; este fallback entrega a SPA para qualquer outra URL.
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), { maxAge: 0 });
  });
}

const server = app.listen(PORT, () => {
  console.log(`Servidor do EnergiaViva rodando na porta ${PORT}`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
