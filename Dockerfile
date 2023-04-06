# Use the official Node.js image as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

RUN npm install -g pm2

# Copy the application source code to the working directory
COPY . .

# Expose the port your application listens on
EXPOSE 8080

# Start the application
CMD ["pm2-runtime", "server.js"]