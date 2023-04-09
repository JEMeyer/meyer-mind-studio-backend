# Use the official Node.js image as the base image
FROM node:bullseye

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the application dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g npm@9.6.4 && \
    npm install

RUN npm install -g pm2

# Copy the application source code to the working directory
COPY . .

# Build the TypeScript code to JavaScript
RUN npm run build

# Expose the port your application listens on
EXPOSE 8080

# Start the application
CMD ["pm2-runtime", "dist/server.js"]
