#!/bin/sh

echo "Waiting for database to be ready..."
# Since docker-compose uses a healthcheck, the app service won't start
# until the postgres service is healthy. But for safety, we can add a check or just log.

echo "Running database migrations..."
node src/db/migrate.js

echo "Starting the application..."
exec "$@"
