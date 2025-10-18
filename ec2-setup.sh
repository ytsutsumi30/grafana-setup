#!/bin/bash
set -e

echo "=========================================="
echo "  EC2 Setup Script"
echo "=========================================="

# 基本パッケージのインストール
echo "📦 Installing basic packages..."
sudo dnf install -y docker git rsync

# Dockerの起動
echo "🐳 Starting Docker..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Docker Composeのインストール
echo "🐙 Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.24.5"
sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Node.jsのインストール（ホストで直接実行する場合）
echo "📦 Installing Node.js..."
sudo dnf install -y nodejs npm

# アプリケーションディレクトリの作成
echo "📁 Creating application directories..."
sudo mkdir -p /var/www/html
sudo chown -R ec2-user:ec2-user /var/www/html

# Nginxを直接インストール（Dockerの外で）
echo "🌐 Installing Nginx..."
sudo dnf install -y nginx
sudo systemctl enable nginx

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Logout and login again for Docker group to take effect"
echo "2. Run: ./quick-deploy.sh --full"
