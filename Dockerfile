# Base image for both builder and runner
FROM node:latest AS base

# Install ffmpeg, sox
RUN apt-get update && \
    apt-get install -y ffmpeg sox && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Builder stage
FROM base AS builder

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the project files
COPY . .

# Build the TypeScript code to JavaScript
RUN pnpm run build

# Final runtime image
FROM base

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and pnpm-lock.yaml files from the builder image
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Copy the built JavaScript files from the builder image
COPY --from=builder /usr/src/app/dist ./dist

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Expose the port your application listens on
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.js"]
