FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:latest
COPY --from=build /app/dist /srv
COPY <<EOF /etc/caddy/Caddyfile
:80 {
    handle /api/* {
        reverse_proxy fh-api:8001
    }
    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }
}
EOF
