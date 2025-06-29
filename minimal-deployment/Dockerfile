FROM node:18-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Run the simple server
CMD ["node", "server.js"]
