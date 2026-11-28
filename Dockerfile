# syntax=docker/dockerfile:1
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY --chown=101:101 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html styles.css app.js data.js /usr/share/nginx/html/
COPY --chown=101:101 data /usr/share/nginx/html/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
