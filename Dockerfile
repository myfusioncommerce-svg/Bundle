FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps like vite) to run the build
RUN npm ci && npm cache clean --force

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Provide dummy ENV vars for build step to satisfy Vite/React Router validation
RUN SHOPIFY_APP_URL=https://dummy.com \
    SHOPIFY_API_KEY=dummy \
    SHOPIFY_API_SECRET=dummy \
    npm run build

# Prune devDependencies to keep the image small
RUN npm prune --omit=dev

CMD ["npm", "run", "docker-start"]
