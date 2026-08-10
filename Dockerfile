# Node 24 "Krypton" is the current LTS. yahoo-finance2 requires >= 22.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first, so this layer stays cached when only src/ changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

# node:alpine ships an unprivileged `node` user; don't run as root.
USER node

CMD ["node", "src/index.js"]
