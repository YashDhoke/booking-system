const db = require('../../config/database');

const getParentBookedSessions = async (parentId, client) => {
  const query = `
    SELECT s.* 
    FROM sessions s
    INNER JOIN bookings b ON b.offering_id = s.offering_id
    WHERE b.parent_id = $1 AND b.status = 'confirmed'
    ORDER BY s.start_time ASC
    FOR UPDATE
  `;
  const executor = client || db;
  const { rows } = await executor.query(query, [parentId]);
  return rows;
};

const getOfferingSessions = async (offeringId, client) => {
  const query = 'SELECT * FROM sessions WHERE offering_id = $1 ORDER BY start_time ASC';
  const executor = client || db;
  const { rows } = await executor.query(query, [offeringId]);
  return rows;
};

const createBooking = async ({ parent_id, offering_id }, client) => {
  const query = `
    INSERT INTO bookings (parent_id, offering_id)
    VALUES ($1, $2)
    RETURNING *
  `;
  const executor = client || db;
  const { rows } = await executor.query(query, [parent_id, offering_id]);
  return rows[0];
};

const findParentBookings = async (parentId) => {
  const query = `
    SELECT b.id, b.status, b.created_at,
           json_build_object(
             'id', o.id,
             'title', o.title,
             'sessions', COALESCE(json_agg(s.* ORDER BY s.start_time ASC) FILTER (WHERE s.id IS NOT NULL), '[]')
           ) as offering
    FROM bookings b
    JOIN offerings o ON b.offering_id = o.id
    LEFT JOIN sessions s ON o.id = s.offering_id
    WHERE b.parent_id = $1
    GROUP BY b.id, o.id
    ORDER BY b.created_at DESC
  `;
  const { rows } = await db.query(query, [parentId]);
  return rows;
};

const findBookingByParentAndOffering = async (parentId, offeringId) => {
  const query = 'SELECT * FROM bookings WHERE parent_id = $1 AND offering_id = $2';
  const { rows } = await db.query(query, [parentId, offeringId]);
  return rows[0];
};

const findById = async (id) => {
  const query = 'SELECT * FROM bookings WHERE id = $1';
  const { rows } = await db.query(query, [id]);
  return rows[0];
};

const cancelBooking = async (bookingId, parentId) => {
  const query = `
    UPDATE bookings 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1 AND parent_id = $2 AND status = 'confirmed'
    RETURNING *
  `;
  const { rows } = await db.query(query, [bookingId, parentId]);
  return rows[0];
};

module.exports = {
  getParentBookedSessions,
  getOfferingSessions,
  createBooking,
  findParentBookings,
  findBookingByParentAndOffering,
  findById,
  cancelBooking,
};
