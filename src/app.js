require('dotenv').config();
const express = require('express');
const { pool } = require('./config/database');
const errorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/AppError');

// Route Imports
const userRoutes = require('./modules/users/user.routes');
const courseRoutes = require('./modules/courses/course.routes');
const offeringRoutes = require('./modules/offerings/offering.routes');
const sessionRoutes = require('./modules/sessions/session.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: NODE_ENV
  });
});

// Route Mounting
app.use('/api/auth', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/offerings/:offeringId/sessions', sessionRoutes);
app.use('/api/bookings', bookingRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('-------------------------------------------');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Database status: Attempting connection...`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log('-------------------------------------------');
});

module.exports = app;
