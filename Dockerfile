# Step 1: Use Node.js base image
FROM node:14-alpine

# Step 2: Set working directory in container
WORKDIR /app

# Step 3: Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Step 4: Copy the rest of the application code
COPY . .

# Step 5: Expose port
EXPOSE 3000

# Step 6: Run the application
CMD ["npm", "start"]
