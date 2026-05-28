const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log for development
  console.error(`[${new Date().toISOString()}] Error:`, err);

  // 1. Zod Validation Error (if using Zod)
  if (err.name === 'ZodError') {
    const message = 'Validation failed';
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ success: false, message, errors });
  }

  // 2. PostgreSQL Unique Violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  // 3. PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    return res.status(404).json({
      success: false,
      message: 'Related resource not found'
    });
  }

  // 4. Custom AppError (Operational)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || []
    });
  }

  // 5. Default Internal Server Error
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

module.exports = errorHandler;
