FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
