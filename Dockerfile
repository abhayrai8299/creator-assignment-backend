# 1) Base image
FROM node:18-alpine

# 2) Create & switch to app directory
WORKDIR /app

# 3) Copy package manifests and install only production deps
#    (using npm ci if you have a package-lock.json for reproducible installs)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 4) Copy the rest of your application code
COPY . .

# 5) (Optional) Set a default PORT—Railway overrides this automatically
ENV PORT=3000

# 6) Expose the port your app listens on
EXPOSE 3000

# 7) Start the application
CMD ["npm", "start"]
