FROM node:20-alpine
WORKDIR /app
COPY server.js .
RUN mkdir -p /app/apk
EXPOSE 3000
ENV PORT=3000
ENV JUHE_KEY=""
ENV APK_DOWNLOAD_URL=""
CMD ["node", "server.js"]
