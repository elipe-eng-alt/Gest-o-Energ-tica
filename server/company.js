import express from 'express';
import { isUniqueViolation } from './db.js';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const PRIORITIES = ['alta', 'media', 'baixa'];
const STATUSES = ['pendente', 'em andamento', 'concluída'];

const text = (value, max = 200) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Número >= 0; vazio vira null (campo opcional). Inválido vira NaN. */
function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

const badRequest = (res, message) => res.status(400).json({ message });

/** Rotas da área logada. Toda consulta filtra pela empresa da sessão (req.user.id). */
export function createCompanyRouter(db, requireUser) {
  const router = express.Router();
  router.use(requireUser);

  const q = {
    units: db.prepare('SELECT id, name, sector FROM units WHERE customer_id = ? ORDER BY name'),
    unitOwned: db.prepare('SELECT id FROM units WHERE id = ? AND customer_id = ?'),
    insertUnit: db.prepare('INSERT INTO units (customer_id, name, sector) VALUES (?, ?, ?)'),
    updateUnit: db.prepare('UPDATE units SET name = ?, sector = ? WHERE id = ? AND customer_id = ?'),
    deleteUnit: db.prepare('DELETE FROM units WHERE id = ? AND customer_id = ?'),
    readings: db.prepare(`
      SELECT id, unit_id AS unitId, month, consumption_kwh AS consumptionKwh, cost,
             peak_kwh AS peakKwh, demand_kw AS demandKw, off_hours_kwh AS offHoursKwh, notes
      FROM readings WHERE customer_id = ? ORDER BY month, unit_id
    `),
    upsertReading: db.prepare(`
      INSERT INTO readings (customer_id, unit_id, month, consumption_kwh, cost, peak_kwh, demand_kw, off_hours_kwh, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (unit_id, month) DO UPDATE SET
        consumption_kwh = excluded.consumption_kwh, cost = excluded.cost, peak_kwh = excluded.peak_kwh,
        demand_kw = excluded.demand_kw, off_hours_kwh = excluded.off_hours_kwh, notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `),
    deleteReading: db.prepare('DELETE FROM readings WHERE id = ? AND customer_id = ?'),
    opportunities: db.prepare(`
      SELECT o.id, o.title, o.description, o.potential, o.savings, o.priority, o.status, o.due,
             o.unit_id AS unitId, COALESCE(u.name, 'Geral') AS unit, COALESCE(u.sector, '') AS sector
      FROM opportunities o LEFT JOIN units u ON u.id = o.unit_id
      WHERE o.customer_id = ? ORDER BY o.id DESC
    `),
    insertOpportunity: db.prepare(`
      INSERT INTO opportunities (customer_id, unit_id, title, description, potential, savings, priority, status, due)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)
    `),
    updateOpportunityStatus: db.prepare('UPDATE opportunities SET status = ? WHERE id = ? AND customer_id = ?'),
    deleteOpportunity: db.prepare('DELETE FROM opportunities WHERE id = ? AND customer_id = ?'),
  };

  // Toda alteração responde com os dados completos da empresa, já atualizados.
  const sendData = (req, res, status = 200) =>
    res.status(status).json({
      units: q.units.all(req.user.id),
      readings: q.readings.all(req.user.id),
      opportunities: q.opportunities.all(req.user.id),
    });

  const ownsUnit = (req, unitId) => Boolean(q.unitOwned.get(unitId, req.user.id));

  router.get('/data', (req, res) => sendData(req, res));

  router.post('/units', (req, res) => {
    const name = text(req.body?.name, 80);
    const sector = text(req.body?.sector, 80);
    if (!name) return badRequest(res, 'Informe o nome da unidade.');
    try {
      q.insertUnit.run(req.user.id, name, sector);
    } catch (error) {
      if (isUniqueViolation(error)) return res.status(409).json({ message: 'Já existe uma unidade com esse nome.' });
      throw error;
    }
    sendData(req, res, 201);
  });

  router.put('/units/:id', (req, res) => {
    const name = text(req.body?.name, 80);
    const sector = text(req.body?.sector, 80);
    if (!name) return badRequest(res, 'Informe o nome da unidade.');
    try {
      const { changes } = q.updateUnit.run(name, sector, Number(req.params.id), req.user.id);
      if (!changes) return res.status(404).json({ message: 'Unidade não encontrada.' });
    } catch (error) {
      if (isUniqueViolation(error)) return res.status(409).json({ message: 'Já existe uma unidade com esse nome.' });
      throw error;
    }
    sendData(req, res);
  });

  router.delete('/units/:id', (req, res) => {
    const { changes } = q.deleteUnit.run(Number(req.params.id), req.user.id);
    if (!changes) return res.status(404).json({ message: 'Unidade não encontrada.' });
    sendData(req, res);
  });

  router.put('/readings', (req, res) => {
    const body = req.body ?? {};
    const unitId = Number(body.unitId);
    const month = text(body.month, 7);
    const consumption = number(body.consumptionKwh);
    const cost = number(body.cost);
    const peak = number(body.peakKwh);
    const demand = number(body.demandKw);
    const offHours = number(body.offHoursKwh);

    if (!ownsUnit(req, unitId)) return badRequest(res, 'Selecione uma unidade válida.');
    if (!MONTH_PATTERN.test(month)) return badRequest(res, 'Informe o mês de referência.');
    if (!consumption) return badRequest(res, 'Informe o consumo total do mês (maior que zero).');
    if (cost === null || Number.isNaN(cost)) return badRequest(res, 'Informe o valor da fatura.');
    if ([peak, demand, offHours].some(Number.isNaN)) return badRequest(res, 'Os valores opcionais devem ser números positivos.');
    if ((peak ?? 0) > consumption) return badRequest(res, 'O consumo na ponta não pode ser maior que o consumo total.');
    if ((offHours ?? 0) > consumption) return badRequest(res, 'O consumo fora do expediente não pode ser maior que o consumo total.');

    q.upsertReading.run(req.user.id, unitId, month, consumption, cost, peak, demand, offHours, text(body.notes, 500));
    sendData(req, res);
  });

  router.delete('/readings/:id', (req, res) => {
    const { changes } = q.deleteReading.run(Number(req.params.id), req.user.id);
    if (!changes) return res.status(404).json({ message: 'Lançamento não encontrado.' });
    sendData(req, res);
  });

  router.post('/opportunities', (req, res) => {
    const body = req.body ?? {};
    const unitId = body.unitId === null || body.unitId === undefined ? null : Number(body.unitId);
    const title = text(body.title, 120);
    const description = text(body.description, 1000);
    const potential = number(body.potential);
    const savings = number(body.savings);

    if (unitId !== null && !ownsUnit(req, unitId)) return badRequest(res, 'Selecione uma unidade válida.');
    if (!title || !description) return badRequest(res, 'Informe título e descrição.');
    if (potential === null || Number.isNaN(potential) || potential > 100) return badRequest(res, 'O impacto deve ser entre 0 e 100%.');
    if (savings === null || Number.isNaN(savings)) return badRequest(res, 'Informe a economia estimada.');
    if (!PRIORITIES.includes(body.priority)) return badRequest(res, 'Prioridade inválida.');

    q.insertOpportunity.run(req.user.id, unitId, title, description, potential, savings, body.priority, text(body.due, 40) || 'A definir');
    sendData(req, res, 201);
  });

  router.patch('/opportunities/:id', (req, res) => {
    if (!STATUSES.includes(req.body?.status)) return badRequest(res, 'Status inválido.');
    const { changes } = q.updateOpportunityStatus.run(req.body.status, Number(req.params.id), req.user.id);
    if (!changes) return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    sendData(req, res);
  });

  router.delete('/opportunities/:id', (req, res) => {
    const { changes } = q.deleteOpportunity.run(Number(req.params.id), req.user.id);
    if (!changes) return res.status(404).json({ message: 'Oportunidade não encontrada.' });
    sendData(req, res);
  });

  return router;
}
