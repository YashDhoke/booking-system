const db = require('../../config/database');

const create = async ({ title, description, teacher_id }) => {
  const query = `
    INSERT INTO courses (title, description, teacher_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await db.query(query, [title, description, teacher_id]);
  return rows[0];
};

const findByTeacherId = async (teacher_id) => {
  const query = 'SELECT * FROM courses WHERE teacher_id = $1 ORDER BY created_at DESC';
  const { rows } = await db.query(query, [teacher_id]);
  return rows[0] ? rows : [];
};

const findById = async (id) => {
  const query = 'SELECT * FROM courses WHERE id = $1';
  const { rows } = await db.query(query, [id]);
  return rows[0];
};

module.exports = {
  create,
  findByTeacherId,
  findById,
};
