const db = require('../../config/database');

const findByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await db.query(query, [email]);
  return rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const { rows } = await db.query(query, [id]);
  return rows[0];
};

const createUser = async ({ name, email, password, role, timezone }) => {
  const query = `
    INSERT INTO users (name, email, password, role, timezone)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, email, role, timezone, created_at
  `;
  const { rows } = await db.query(query, [name, email, password, role, timezone]);
  return rows[0];
};

module.exports = {
  findByEmail,
  findById,
  createUser,
};
