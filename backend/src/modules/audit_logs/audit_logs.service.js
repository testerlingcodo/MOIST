'use strict';

const { query, newId } = require('../../config/db');

async function log({ actor_id, actor_name, actor_role, action, entity, entity_id, description, details }) {
  const id = newId();
  await query(
    `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity, entity_id, description, details_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      actor_id || null,
      actor_name || null,
      actor_role || null,
      action,
      entity,
      entity_id || null,
      description || null,
      details ? JSON.stringify(details) : null,
    ]
  ).catch(() => {}); // never block the main operation
}

async function list({ page = 1, limit = 50, entity, actor_id, action, search } = {}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (entity)    { conditions.push('entity = ?');    params.push(entity); }
  if (actor_id)  { conditions.push('actor_id = ?');  params.push(actor_id); }
  if (action)    { conditions.push('action = ?');    params.push(action); }
  if (search) {
    conditions.push('(actor_name LIKE ? OR description LIKE ? OR entity_id LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: dataRes.rows, total };
}

module.exports = { log, list };
