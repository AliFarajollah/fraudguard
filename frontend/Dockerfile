# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_ML_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ML_URL=$VITE_ML_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ──────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing — redirect all requests to index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
