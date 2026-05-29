const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  // Get all .sql files and sort them to ensure correct execution order
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  logger.info(`Found ${files.length} migration files.`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    logger.info(`Running migration: ${file}...`);
    
    try {
      await pool.query(sql);
      logger.info(`Successfully completed: ${file}`);
    } catch (err) {
      logger.error(`Error running migration ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  logger.info('All migrations executed successfully.');
  process.exit(0);
}

runMigrations().catch(err => {
  logger.error('Migration runner failed:', err);
  process.exit(1);
});

