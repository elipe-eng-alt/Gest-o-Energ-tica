import express from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { openDatabase, isUniqueViolation } from './db.js';
import { createAuth, createRateLimiter } from './auth.js';
import { createCompanyRouter } from './company.js';
import { sendOwnerNotification } from './mail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(projectRoot, 'data');
const { db, dbPath } = openDatabase(dataDir);
console.log('SQLite inicializado em:', dbPath);

const app = express();
const PORT = process.env.PORT || 3001;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash de referência: comparar contra ele quando o e-mail não existe evita revelar quais e-mails têm conta.
const DUMMY_HASH = bcrypt.hashSync('energia-viva-dummy-password', 10);

// Atrás do proxy do Railway: faz req.secure refletir HTTPS (cookie com flag Secure).
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

const auth = createAuth(db);
const loginAllowed = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const signupAllowed = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

const listCustomers = db.prepare(
  'SELECT id, name, company_name, email, phone, document, sector, position, created_at FROM customers ORDER BY created_at DESC',
);
const insertCustomer = db.prepare(
  'INSERT INTO customers (name, company_name, email, phone, document, sector, position, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
);
const findCustomerByEmail = db.prepare(
  'SELECT id, name, company_name AS companyName, email, password_hash AS passwordHash FROM customers WHERE email = ?',
);

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
  res.json(listCustomers.all());
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

  if (!signupAllowed(req.ip)) {
    return res.status(429).json({ message: 'Muitos cadastros a partir desta rede. Tente novamente mais tarde.' });
  }

  let customerId;
  try {
    const passwordHash = await bcrypt.hash(senha, 10);
    customerId = Number(insertCustomer.run(nome, empresa, email, telefone, document, setor, cargo, passwordHash).lastInsertRowid);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ message: 'Este e-mail já foi cadastrado. Use "Entrar" para acessar sua conta.' });
    }

    console.error('Erro no cadastro:', error);
    return res.status(500).json({ message: 'Erro ao salvar o cadastro.' });
  }

  // Cadastro concluído já entra na conta da empresa.
  auth.startSession(req, res, customerId);
  res.status(201).json({
    message: 'Cadastro realizado com sucesso.',
    user: { id: customerId, name: nome, companyName: empresa, email },
  });

  const customer = { name: nome, company_name: empresa, email, phone: telefone, position: cargo, sector: setor };
  sendOwnerNotification(customer)
    .then((result) => console.log('Notificação de cadastro enviada:', result))
    .catch((mailError) => console.error('Erro ao enviar e-mail:', mailError.message));
});

app.post('/api/auth/login', async (req, res) => {
  const email = asText(req.body?.email).toLowerCase();
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

  if (!email || !senha) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' });
  }

  if (!loginAllowed(`${req.ip}|${email}`)) {
    return res.status(429).json({ message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  }

  const customer = findCustomerByEmail.get(email);
  const valid = await bcrypt.compare(senha, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !valid) {
    return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
  }

  auth.startSession(req, res, customer.id);
  res.json({ user: { id: customer.id, name: customer.name, companyName: customer.companyName, email: customer.email } });
});

app.post('/api/auth/logout', (req, res) => {
  auth.endSession(req, res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: auth.currentUser(req) });
});

app.use('/api/company', createCompanyRouter(db, auth.requireUser));

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Rota da API não encontrada.' });
});

// Erros não tratados nas rotas: registra e responde sem expor detalhes.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' });
  console.error('Erro na requisição:', error);
  res.status(500).json({ message: 'Erro interno. Tente novamente.' });
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
