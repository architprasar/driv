FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG PUBLIC_HOST
ARG DEMO_MODE=False
ENV NEXT_PUBLIC_DEMO_MODE=${DEMO_MODE}
ENV NEXT_PUBLIC_API_URL=https://${PUBLIC_HOST}/api
ENV NEXT_PUBLIC_API_ORIGIN=https://${PUBLIC_HOST}
ENV NEXT_PUBLIC_WS_URL=wss://${PUBLIC_HOST}
ENV API_SERVER_URL=http://backend:8000/api
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
ENV API_SERVER_URL=http://backend:8000/api
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
