const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    logger.error('ERROR 💥', err);
    res.status(500).json({
      success: false,
      message: 'Something went very wrong!',
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error using Winston
  logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`);

  let error = { ...err };
  error.message = err.message;

  // 1. Zod Validation Error (if using Zod)
  if (err.name === 'ZodError') {
    const message = 'Validation failed';
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    error = new AppError(message, 400, errors);
  }

  // 2. PostgreSQL Unique Violation
  if (err.code === '23505') {
    error = new AppError('Resource already exists', 409);
  }

  // 3. PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    error = new AppError('Related resource not found', 404);
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler;

