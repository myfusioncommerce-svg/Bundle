FROM node:20-alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency files first
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies like vite)
RUN npm ci && npm cache clean --force

# Copy the rest of the application
COPY . .

# Generate Prisma client before build
RUN npx prisma generate

# Run build with dummy environment variables to satisfy validation
# We don't set NODE_ENV=production yet so that dev tools are available
RUN SHOPIFY_APP_URL=https://dummy.com \
    SHOPIFY_API_KEY=dummy \
    SHOPIFY_API_SECRET=dummy \
    npm run build

# Set environment to production and prune devDependencies
ENV NODE_ENV=production
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
