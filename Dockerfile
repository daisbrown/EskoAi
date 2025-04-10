# Stage 1: Build the React application
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the static files using a lightweight server
FROM node:18-alpine
WORKDIR /app
# Install 'serve' to host the static files
RUN npm install -g serve
# Copy the built application from the builder stage
COPY --from=builder /app/build ./build
# Expose the port serve will run on (default is 3000)
EXPOSE 3000
# Command to run serve, serving the build folder
# -s indicates single-page app mode (handles routing)
# -l specifies the port *inside* the container
CMD ["serve", "-s", "build", "-l", "3000"]
