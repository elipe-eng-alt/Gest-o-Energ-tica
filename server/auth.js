import crypto from 'node:crypto';

const COOKIE_NAME = 'ev_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

/** Sessões em cookie HttpOnly; no banco fica só o hash do token. */
export function createAuth(db) {
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES (?, ?, ?)');
  const findUser = db.prepare(`
    SELECT c.id, c.name, c.company_name AS companyName, c.email
    FROM sessions s JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `);
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const purgeExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

  function startSession(req, res, customerId) {
    purgeExpired.run(Date.now());
    const token = crypto.randomBytes(32).toString('base64url');
    insertSession.run(hashToken(token), customerId, Date.now() + SESSION_MS);
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: SESSION_MS, path: '/' });
  }

  function endSession(req, res) {
    const token = readCookie(req, COOKIE_NAME);
    if (token) deleteSession.run(hashToken(token));
    res.clearCookie(COOKIE_NAME, { path: '/' });
  }

  function currentUser(req) {
    const token = readCookie(req, COOKIE_NAME);
    return token ? (findUser.get(hashToken(token), Date.now()) ?? null) : null;
  }

  function requireUser(req, res, next) {
    const user = currentUser(req);
    if (!user) return res.status(401).json({ message: 'Sua sessão expirou. Entre novamente.' });
    req.user = user;
    next();
  }

  const insertReset = db.prepare('INSERT INTO password_resets (token_hash, customer_id, expires_at) VALUES (?, ?, ?)');
  const purgeResets = db.prepare('DELETE FROM password_resets WHERE expires_at <= ? OR used_at IS NOT NULL');
  // Marca como usado e devolve o dono numa única instrução: o mesmo link não funciona duas vezes.
  const consumeResetStmt = db.prepare(`
    UPDATE password_resets SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
    RETURNING customer_id AS customerId
  `);
  const cancelResets = db.prepare('UPDATE password_resets SET used_at = ? WHERE customer_id = ? AND used_at IS NULL');
  const deleteSessionsOf = db.prepare('DELETE FROM sessions WHERE customer_id = ?');

  function createPasswordReset(customerId) {
    purgeResets.run(Date.now());
    const token = crypto.randomBytes(32).toString('base64url');
    insertReset.run(hashToken(token), customerId, Date.now() + RESET_MS);
    return token;
  }

  /** Valida o link; se válido, invalida todos os links pendentes da conta e devolve o id do cliente. */
  function consumePasswordReset(token) {
    if (typeof token !== 'string' || !token) return null;
    const now = Date.now();
    const row = consumeResetStmt.get(now, hashToken(token), now);
    if (!row) return null;
    cancelResets.run(now, row.customerId);
    return row.customerId;
  }

  const endAllSessions = (customerId) => deleteSessionsOf.run(customerId);

  return { startSession, endSession, currentUser, requireUser, createPasswordReset, consumePasswordReset, endAllSessions };
}

/** Limitador simples em memória: no máximo `max` tentativas por chave a cada `windowMs`. */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [k, entry] of hits) if (entry.reset < now) hits.delete(k);
    }
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
}
