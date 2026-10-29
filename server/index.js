import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const dbPath = path.join(dataDir, 'energy-viva.db');

fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Erro ao abrir SQLite:', error.message);
    return;
  }

  db.run(`
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
    )
  `);

  console.log('SQLite inicializado em:', dbPath);
});

const getOwnerEmail = () => process.env.OWNER_EMAIL || 'owner@empresa.com';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

async function sendOwnerNotification(customer) {
  const ownerEmail = getOwnerEmail();

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
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
    text: `
      Novo cadastro realizado no portal.

      Nome: ${customer.name}
      Empresa: ${customer.company_name}
      E-mail: ${customer.email}
      Telefone: ${customer.phone}
      Cargo: ${customer.position}
      Setor: ${customer.sector}
    `,
  });

  return { simulated: false, messageId: info.messageId };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API do EnergiaViva ativa.' });
});

app.get('/api/customers', (req, res) => {
  db.all('SELECT id, name, company_name, email, phone, document, sector, position, created_at FROM customers ORDER BY created_at DESC', (error, rows) => {
    if (error) {
      res.status(500).json({ message: 'Erro ao listar clientes.' });
      return;
    }

    res.json(rows);
  });
});

app.post('/api/customers', async (req, res) => {
  const {
    nome,
    empresa,
    email,
    telefone,
    document,
    setor,
    cargo,
    senha,
    confirmarSenha,
  } = req.body;

  if (!nome || !empresa || !email || !telefone || !document || !setor || !cargo || !senha) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  if (senha.length < 8) {
    return res.status(400).json({ message: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  if (senha !== confirmarSenha) {
    return res.status(400).json({ message: 'As senhas não conferem.' });
  }

  try {
    const passwordHash = await bcrypt.hash(senha, 10);

    db.run(
      `INSERT INTO customers (name, company_name, email, phone, document, sector, position, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ? )`,
      [nome, empresa, email, telefone, document, setor, cargo, passwordHash],
      async (insertError) => {
        if (insertError) {
          if (insertError.message.includes('UNIQUE')) {
            return res.status(409).json({ message: 'Este e-mail já foi cadastrado.' });
          }

          return res.status(500).json({ message: 'Erro ao salvar o cadastro.' });
        }

        const customer = { name: nome, company_name: empresa, email, phone: telefone, position: cargo, sector: setor };

        try {
          const notification = await sendOwnerNotification(customer);
          return res.status(201).json({
            message: 'Cadastro realizado com sucesso. Notificação enviada ao owner.',
            notification,
          });
        } catch (mailError) {
          console.error('Erro ao enviar e-mail:', mailError);
          return res.status(201).json({
            message: 'Cadastro realizado com sucesso, mas houve falha ao enviar o e-mail para o owner.',
          });
        }
      },
    );
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro interno ao processar o cadastro.' });
  }
});

const distPath = path.resolve(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'Rota da API não encontrada.' });
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor do EnergiaViva rodando na porta ${PORT}`);
});
