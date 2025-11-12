#!/bin/bash
set -e

# ========================================
# User Data Script for Production Management System
# ========================================

# Update system
dnf update -y

# Install Docker
dnf install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
DOCKER_COMPOSE_VERSION="2.24.5"
curl -L "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Git
dnf install -y git

# Install CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm
rm -f ./amazon-cloudwatch-agent.rpm

# Create application directory
APP_DIR="/opt/production-management"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (replace with your actual repo)
# git clone https://github.com/your-org/production-management.git .

# For now, we'll create the necessary structure
mkdir -p api web postgres/init nginx/conf.d grafana/provisioning/datasources prometheus ssl

# Create .env file
cat > .env <<EOF
# Database Configuration
DB_HOST=${db_host}
DB_PORT=5432
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}

# Application Configuration
NODE_ENV=production
PORT=3001

# Environment
ENVIRONMENT=${environment}
EOF

# Create docker-compose.yml for AWS deployment
cat > docker-compose.yml <<'COMPOSE_EOF'
services:
  # nginx - Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: production-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./web:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - production-api
    networks:
      - production-network

  # Production API Server
  production-api:
    image: node:18-alpine
    container_name: production-api
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=$${DB_HOST}
      - DB_PORT=5432
      - DB_NAME=$${DB_NAME}
      - DB_USER=$${DB_USER}
      - DB_PASSWORD=$${DB_PASSWORD}
    volumes:
      - ./api:/app
    command: sh -c "npm install && npm start"
    networks:
      - production-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost/grafana/
      - GF_SERVER_SERVE_FROM_SUB_PATH=true
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - production-network

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-storage:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
      - '--web.external-url=http://localhost/prometheus/'
      - '--web.route-prefix=/prometheus/'
    networks:
      - production-network

volumes:
  grafana-storage:
  prometheus-storage:

networks:
  production-network:
    driver: bridge
COMPOSE_EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/production-management.service <<'SERVICE_EOF'
[Unit]
Description=Production Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/production-management
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Set permissions
chown -R ec2-user:ec2-user $APP_DIR

# Enable and start service
systemctl daemon-reload
systemctl enable production-management.service

# Initial deployment message
cat > /home/ec2-user/DEPLOYMENT_INSTRUCTIONS.txt <<'INSTRUCTIONS'
========================================
Production Management System - Deployment Instructions
========================================

1. Upload your application files to /opt/production-management/
   - Copy api/, web/, nginx/, grafana/, prometheus/ directories

2. Start the application:
   sudo systemctl start production-management

3. Check status:
   sudo systemctl status production-management
   docker ps

4. View logs:
   cd /opt/production-management
   docker-compose logs -f

5. Access the application:
   - Main App: http://<EC2-PUBLIC-IP>
   - Grafana: http://<EC2-PUBLIC-IP>/grafana/
   - Prometheus: http://<EC2-PUBLIC-IP>/prometheus/

6. Database connection:
   - Host: ${db_host}
   - Database: ${db_name}
   - User: ${db_user}
   - Password: (stored in .env)

Note: Application will auto-start on EC2 boot
========================================
INSTRUCTIONS

chown ec2-user:ec2-user /home/ec2-user/DEPLOYMENT_INSTRUCTIONS.txt

echo "User data script completed successfully"
