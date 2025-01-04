# Base image for both builder and runner
FROM node:20-alpine AS base
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
FROM node:20-alpine AS prod-runtime
WORKDIR /app

# Copy built files and node_modules from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/yarn.lock ./yarn.lock

# Expose the backend port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production

# Start the backend server
CMD ["yarn", "start"]
