FROM node:20-slim AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
# API URL build anında gerekir; ARG burada kalırsa npm ci katmanı cache'lenebilir
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:20-slim
WORKDIR /usr/src/app
RUN npm i -g serve
COPY --from=builder /usr/src/app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]

