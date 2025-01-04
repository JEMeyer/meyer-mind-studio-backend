# Base image for both builder and runner
FROM node:20 AS base
WORKDIR /app

# Install ffmpeg, sox
RUN apt-get update && \
    apt-get install -y ffmpeg sox && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Builder stage
FROM base AS build

# Build the TypeScript code to JavaScript
RUN yarn build

# Final runtime image
FROM build AS prod-runtime
WORKDIR /app

# Expose the backend port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production

# Start the backend server
CMD ["yarn", "start"]
