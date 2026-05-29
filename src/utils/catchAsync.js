/**
 * Wraps an asynchronous function to catch any errors and pass them to the next middleware (the global error handler).
 * Prevents the need for repetitive try-catch blocks in controllers.
 */
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
