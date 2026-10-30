import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

export function openDatabase(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'energy-viva.db');
  const db = new DatabaseSync(dbPath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

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

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sector TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (customer_id, name)
    );

    -- Um lançamento por unidade e mês (dados da fatura de energia).
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      consumption_kwh REAL NOT NULL,
      cost REAL NOT NULL,
      peak_kwh REAL,
      demand_kw REAL,
      off_hours_kwh REAL,
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (unit_id, month)
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      potential REAL NOT NULL,
      savings REAL NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('alta', 'media', 'baixa')),
      status TEXT NOT NULL CHECK (status IN ('pendente', 'em andamento', 'concluída')),
      due TEXT NOT NULL DEFAULT 'A definir',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Links de redefinição de senha: só o hash do token, uso único, expiram em 1 hora.
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions (customer_id);
    CREATE INDEX IF NOT EXISTS idx_password_resets_customer ON password_resets (customer_id);
    CREATE INDEX IF NOT EXISTS idx_readings_customer ON readings (customer_id, month);
    CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities (customer_id);
  `);

  return { db, dbPath };
}

export const isUniqueViolation = (error) => String(error?.message).includes('UNIQUE constraint failed');
