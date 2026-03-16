FROM node:18-alpine

WORKDIR /app

# package.jsonのみ先にコピー（キャッシュ最適化）
COPY package*.json ./
RUN npm install

# ソースコードをコピー
COPY . .

# Angular開発サーバー起動（ポート4200、外部アクセス許可）
EXPOSE 4200
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
