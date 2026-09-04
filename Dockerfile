# Build stage: Node builds the static site. The modcheck git submodule must be
# checked out before the build context is created (Coolify: enable submodules).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN test -f modcheck/data/commands.json || (echo "modcheck submodule is not checked out" && exit 1)
RUN npm run build

# Serve stage: plain nginx with the pre-rendered site.
FROM nginx:alpine
# The stock image symlinks its logs to stdout/stderr, where Docker would keep
# visitor IPs indefinitely. Log to real files instead and rotate them away
# after 14 days at the latest — the retention the privacy page states.
RUN apk add --no-cache logrotate \
 && rm /var/log/nginx/access.log /var/log/nginx/error.log
COPY logrotate-nginx.conf /etc/logrotate.d/nginx
COPY docker-crond.sh /docker-entrypoint.d/45-crond.sh
RUN chmod +x /docker-entrypoint.d/45-crond.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
