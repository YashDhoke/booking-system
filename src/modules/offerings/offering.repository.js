const db = require('../../config/database');

const create = async ({ course_id, teacher_id, title, description }) => {
  const query = `
    INSERT INTO offerings (course_id, teacher_id, title, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await db.query(query, [course_id, teacher_id, title, description]);
  return rows[0];
};

const findByTeacherId = async (teacher_id) => {
  const query = `
    SELECT o.*, 
           COALESCE(json_agg(s.*) FILTER (WHERE s.id IS NOT NULL), '[]') as sessions
    FROM offerings o
    LEFT JOIN sessions s ON o.id = s.offering_id
    WHERE o.teacher_id = $1
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  const { rows } = await db.query(query, [teacher_id]);
  return rows;
};

const findById = async (id) => {
  const query = 'SELECT * FROM offerings WHERE id = $1';
  const { rows } = await db.query(query, [id]);
  return rows[0];
};

const findAllWithSessions = async () => {
  const query = `
    SELECT o.*, u.name as teacher_name,
           COALESCE(json_agg(s.*) FILTER (WHERE s.id IS NOT NULL), '[]') as sessions
    FROM offerings o
    JOIN users u ON o.teacher_id = u.id
    LEFT JOIN sessions s ON o.id = s.offering_id
    GROUP BY o.id, u.name
    ORDER BY o.created_at DESC
  `;
  const { rows } = await db.query(query);
  return rows;
};

module.exports = {
  create,
  findByTeacherId,
  findById,
  findAllWithSessions,
};
