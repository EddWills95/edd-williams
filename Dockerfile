# Use an official Node.js runtime as a parent image
FROM node:20 AS build

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package.json ./
COPY yarn.lock ./

# Install the dependencies
RUN yarn install

# Copy the rest of the application code to the container
COPY . ./

# Build the Svelte app
RUN yarn build

# Use the latest Nginx image
FROM nginx:1.25-alpine

# Copy the build output to Nginx's html directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port the app runs on
EXPOSE 80

# Command to run Nginx
CMD ["nginx", "-g", "daemon off;"]