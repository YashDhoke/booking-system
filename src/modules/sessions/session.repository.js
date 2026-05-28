const db = require('../../config/database');

const create = async ({ offering_id, teacher_id, start_time, end_time }) => {
  const query = `
    INSERT INTO sessions (offering_id, teacher_id, start_time, end_time)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await db.query(query, [offering_id, teacher_id, start_time, end_time]);
  return rows[0];
};

const findByOfferingId = async (offering_id) => {
  const query = 'SELECT * FROM sessions WHERE offering_id = $1 ORDER BY start_time ASC';
  const { rows } = await db.query(query, [offering_id]);
  return rows;
};

const bulkCreate = async (sessionsArray) => {
  if (sessionsArray.length === 0) return [];

  const values = [];
  const placeholders = [];
  
  sessionsArray.forEach((s, i) => {
    const baseIndex = i * 4;
    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
    values.push(s.offering_id, s.teacher_id, s.start_time, s.end_time);
  });

  const query = `
    INSERT INTO sessions (offering_id, teacher_id, start_time, end_time)
    VALUES ${placeholders.join(', ')}
    RETURNING *
  `;
  
  const { rows } = await db.query(query, values);
  return rows;
};

module.exports = {
  create,
  findByOfferingId,
  bulkCreate,
};
