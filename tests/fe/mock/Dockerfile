FROM node:20-alpine

WORKDIR /app

COPY tests/fe/mock/server.js /app/server.js
COPY tests/fe/mock/fixtures /app/fixtures

ENV NODE_ENV=production
ENV OIG_MOCK_PORT=8124

EXPOSE 8124

CMD ["node", "/app/server.js"]
