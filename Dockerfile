# Base image for both builder and runner
FROM node:latest AS base

# Install ffmpeg, sox, and postgresql-client
RUN apt-get update && \
    apt-get install -y ffmpeg sox postgresql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Builder stage
FROM base AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files and the application source code to the working directory
COPY . .

# Install the application dependencies
RUN npm install

# Build the TypeScript code to JavaScript
RUN npm run build

# Final runtime image
FROM base

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files from the builder image
COPY --from=builder /usr/src/app/package*.json ./

# Copy the built JavaScript files from the builder image
COPY --from=builder /usr/src/app/dist ./dist

# Create the public directory
RUN mkdir -p /usr/src/app/public

# Install the application dependencies
RUN npm ci --production

# Install PM2
RUN npm install -g pm2

# Expose the port your application listens on
EXPOSE 8080

# Start the application
CMD ["pm2-runtime", "dist/server.js" , "-i", "4"]
