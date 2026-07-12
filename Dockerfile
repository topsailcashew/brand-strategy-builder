# Cloud Run container for the Brand Strategy Builder (Express + built SPA).
FROM node:20-slim

WORKDIR /app

# Install dependencies (build needs devDeps: vite, esbuild, tailwind).
COPY package*.json ./
RUN npm ci

# Build the frontend (dist/) and bundle the server (dist/server.cjs).
COPY . .
RUN npm run build

# Serve static assets + API from the bundled server, not the Vite dev server.
ENV NODE_ENV=production

# Cloud Run sets PORT (default 8080); the server reads process.env.PORT.
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
