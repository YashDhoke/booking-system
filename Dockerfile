FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose the internal port
EXPOSE 3000

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Use the entrypoint script to handle migrations
ENTRYPOINT ["./docker-entrypoint.sh"]

CMD ["npm", "run", "dev"]
