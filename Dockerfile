# Build stage: Node builds the static site. The modcheck git submodule must be
# checked out before the build context is created (Coolify: enable submodules).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN test -f modcheck/data/commands.json || (echo "modcheck submodule is not checked out" && exit 1)
RUN npm run build

# Serve stage: plain nginx with the pre-rendered site. Logs go to
# stdout/stderr with the visitor IP anonymized before anything is written
# (see nginx.conf), so no full IP is stored anywhere.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
