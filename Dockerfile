FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./public
COPY --from=builder /app/server/package*.json ./server/
RUN cd server && npm install --omit=dev
RUN mkdir -p /app/data
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
