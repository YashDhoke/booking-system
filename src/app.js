require('dotenv').config();
const express = require('express');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

/**
 * Module Routes (Placeholders)
 * Uncomment as modules are implemented
 */
// const userRoutes = require('./modules/users/user.routes');
// const courseRoutes = require('./modules/courses/course.routes');
// const offeringRoutes = require('./modules/offerings/offering.routes');
// const sessionRoutes = require('./modules/sessions/session.routes');
// const bookingRoutes = require('./modules/bookings/booking.routes');

// app.use('/api/users', userRoutes);
// app.use('/api/courses', courseRoutes);
// app.use('/api/offerings', offeringRoutes);
// app.use('/api/sessions', sessionRoutes);
// app.use('/api/bookings', bookingRoutes);

// Error Middleware (Placeholder)
// const { errorHandler } = require('./middlewares/error.middleware');
// app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
