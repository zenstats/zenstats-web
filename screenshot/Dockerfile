FROM mcr.microsoft.com/playwright:v1.65.0-noble
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && chown -R pwuser:pwuser /app
COPY --chown=pwuser:pwuser *.mjs ./
USER pwuser
EXPOSE 8090
CMD ["node", "server.mjs"]
