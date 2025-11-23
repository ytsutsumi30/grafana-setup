#!/bin/bash
set -e

# ========================================
# Production Management System - Deployment Script
# ========================================

TERRAFORM_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$TERRAFORM_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ========================================
# Check Prerequisites
# ========================================
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed"
        exit 1
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# ========================================
# Initialize Terraform
# ========================================
init_terraform() {
    log_info "Initializing Terraform..."
    cd "$TERRAFORM_DIR"

    if [ ! -f "terraform.tfvars" ]; then
        log_warning "terraform.tfvars not found, creating from example..."
        cp terraform.tfvars.example terraform.tfvars
        log_warning "Please edit terraform.tfvars and run this script again"
        exit 0
    fi

    terraform init
    log_success "Terraform initialized"
}

# ========================================
# Deploy Infrastructure
# ========================================
deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    cd "$TERRAFORM_DIR"

    # Plan
    terraform plan -out=tfplan

    # Confirm
    echo ""
    read -p "Do you want to apply this plan? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_warning "Deployment cancelled"
        exit 0
    fi

    # Apply
    terraform apply tfplan
    rm -f tfplan

    log_success "Infrastructure deployed"
}

# ========================================
# Upload Application Files
# ========================================
upload_application() {
    log_info "Uploading application files..."
    cd "$TERRAFORM_DIR"

    # Get EC2 IP
    EC2_IP=$(terraform output -raw ec2_public_ip)
    KEY_NAME=$(terraform output -raw ssh_command | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' | sed 's/\.pem//')
    KEY_PATH="$HOME/.ssh/${KEY_NAME}.pem"

    if [ ! -f "$KEY_PATH" ]; then
        log_error "SSH key not found: $KEY_PATH"
        exit 1
    fi

    log_info "EC2 IP: $EC2_IP"
    log_info "Waiting for EC2 to be ready..."
    sleep 30

    # Test SSH connection
    max_retries=10
    retry=0
    while [ $retry -lt $max_retries ]; do
        if ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@$EC2_IP "echo 'SSH connection successful'" &> /dev/null; then
            log_success "SSH connection established"
            break
        fi
        retry=$((retry + 1))
        log_warning "Retry $retry/$max_retries - waiting for SSH..."
        sleep 10
    done

    if [ $retry -eq $max_retries ]; then
        log_error "Failed to establish SSH connection"
        exit 1
    fi

    # Create remote directory
    log_info "Creating remote directory..."
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "sudo mkdir -p /opt/production-management && sudo chown ec2-user:ec2-user /opt/production-management"

    # Upload entire project (excluding sensitive and unnecessary files)
    log_info "Uploading application files..."
    rsync -avz -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'terraform' \
        --exclude '*.log' \
        --exclude 'github-pages' \
        --exclude 'ssl/server.key' \
        --exclude '.env' \
        --exclude '*.tfstate*' \
        --exclude '.terraform' \
        "$PROJECT_ROOT/" \
        ec2-user@$EC2_IP:/opt/production-management/
    
    log_success "Application files uploaded"
    
    # Upload docker-compose.yml
    log_info "Uploading docker-compose configuration..."
    scp -i "$KEY_PATH" -o StrictHostKeyChecking=no \
        "$PROJECT_ROOT/docker-compose.yml" \
        ec2-user@$EC2_IP:/opt/production-management/
    
    # Generate .env file with Terraform outputs
    log_info "Generating .env file on EC2..."
    DB_ENDPOINT=$(terraform output -raw rds_endpoint)
    DB_HOST=$(echo "$DB_ENDPOINT" | cut -d: -f1)
    
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'ENVEOF'
cd /opt/production-management

# Create .env file
cat > .env << 'DOTENV'
# Database Configuration (RDS)
DB_HOST=RDS_HOST_PLACEHOLDER
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=production_pass

# Application Configuration
NODE_ENV=production
API_PORT=3001

# Monitoring (Optional)
GRAFANA_ADMIN_PASSWORD=admin
PROMETHEUS_RETENTION=15d
DOTENV

# Replace placeholder with actual RDS host
sed -i "s/RDS_HOST_PLACEHOLDER/$DB_HOST_PLACEHOLDER/g" .env
chmod 600 .env

echo ".env file created"
ENVEOF

    # Pass DB_HOST to remote script
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "sed -i 's/RDS_HOST_PLACEHOLDER/$DB_HOST/g' /opt/production-management/.env"
    
    log_success "Configuration files uploaded and generated"
}

# ========================================
# Setup SSL Certificate
# ========================================
setup_ssl() {
    log_info "Setting up SSL certificate..."
    cd "$TERRAFORM_DIR"

    EC2_IP=$(terraform output -raw ec2_public_ip)
    KEY_NAME=$(terraform output -raw ssh_command | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' | sed 's/\.pem//')
    KEY_PATH="$HOME/.ssh/${KEY_NAME}.pem"

    # Generate SSL certificate on EC2
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
cd /opt/production-management

# Create ssl directory if not exists
mkdir -p ssl

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create OpenSSL configuration
cat > ssl/openssl.cnf << SSLCONF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = JP
ST = Tokyo
L = Tokyo
O = Production Management System
OU = QR Inspection
CN = $PUBLIC_IP

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.local
DNS.3 = *.compute.amazonaws.com
IP.1 = 127.0.0.1
IP.2 = $PUBLIC_IP
SSLCONF

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -config ssl/openssl.cnf

# Set permissions
sudo chmod 600 ssl/server.key
sudo chmod 644 ssl/server.crt

echo "SSL certificate generated for $PUBLIC_IP"

# Update nginx configuration with actual IP
sudo sed -i "s/server_name .*/server_name $PUBLIC_IP localhost;/g" nginx/conf.d/default.conf

echo "Nginx configuration updated"
EOF

    log_success "SSL certificate configured"
}

# ========================================
# Initialize Database
# ========================================
init_database() {
    log_info "Initializing database..."
    cd "$TERRAFORM_DIR"

    EC2_IP=$(terraform output -raw ec2_public_ip)
    KEY_NAME=$(terraform output -raw ssh_command | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' | sed 's/\.pem//')
    KEY_PATH="$HOME/.ssh/${KEY_NAME}.pem"

    # Run database initialization
    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
cd /opt/production-management

# Get DB credentials from .env
export $(grep -v '^#' .env | xargs)

# Wait for RDS to be available
echo "Waiting for RDS to be available..."
max_retries=30
retry=0
while [ $retry -lt $max_retries ]; do
    if docker run --rm -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
        psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT 1" &> /dev/null; then
        echo "RDS is available"
        break
    fi
    retry=$((retry + 1))
    echo "Retry $retry/$max_retries - waiting for RDS..."
    sleep 10
done

# Initialize database
if [ -d postgres/init ]; then
    echo "Running database initialization scripts..."
    for sql_file in postgres/init/*.sql; do
        if [ -f "$sql_file" ]; then
            echo "Executing: $(basename $sql_file)"
            docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
                psql -h $DB_HOST -U $DB_USER -d $DB_NAME < "$sql_file"
        fi
    done
    echo "Database initialized"
else
    echo "Warning: postgres/init directory not found"
fi

# Run additional QR inspection tables setup
if [ -f postgres/init/02-qr-inspection-tables.sql ]; then
    echo "Setting up QR inspection tables..."
    docker run --rm -i -e PGPASSWORD=$DB_PASSWORD postgres:15-alpine \
        psql -h $DB_HOST -U $DB_USER -d $DB_NAME < postgres/init/02-qr-inspection-tables.sql
    echo "QR inspection tables created"
fi
EOF

    log_success "Database initialized"
}

# ========================================
# Start Application
# ========================================
start_application() {
    log_info "Starting application..."
    cd "$TERRAFORM_DIR"

    EC2_IP=$(terraform output -raw ec2_public_ip)
    KEY_NAME=$(terraform output -raw ssh_command | grep -oP '(?<=-i ~/\.ssh/)[^ ]+' | sed 's/\.pem//')
    KEY_PATH="$HOME/.ssh/${KEY_NAME}.pem"

    ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
cd /opt/production-management

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: docker-compose not found"
    exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
$COMPOSE_CMD down 2>/dev/null || true

# Pull latest images
echo "Pulling Docker images..."
$COMPOSE_CMD pull

# Start containers
echo "Starting containers with docker-compose..."
$COMPOSE_CMD up -d

# Wait for containers to be healthy
echo "Waiting for containers to start..."
sleep 20

# Check container status
echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check application health
echo ""
echo "Checking application health..."
max_retries=10
retry=0
while [ $retry -lt $max_retries ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200\|301\|302"; then
        echo "✓ Application is responding"
        break
    fi
    retry=$((retry + 1))
    echo "Retry $retry/$max_retries - waiting for application..."
    sleep 5
done

# Show logs
echo ""
echo "Recent logs:"
$COMPOSE_CMD logs --tail=20
EOF

    log_success "Application started"
}

# ========================================
# Show Outputs
# ========================================
show_outputs() {
    log_info "Deployment information:"
    cd "$TERRAFORM_DIR"

    echo ""
    terraform output

    EC2_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "N/A")

    echo ""
    echo "========================================="
    echo "🌐 Access URLs:"
    echo "========================================="
    echo "HTTP:             http://$EC2_IP"
    echo "HTTPS:            https://$EC2_IP"
    echo "Camera Test:      http://$EC2_IP/camera-test.html"
    echo "Grafana:          http://$EC2_IP:3000 (optional)"
    echo ""
    echo "========================================="
    echo "📱 iPhone Access:"
    echo "========================================="
    echo "For QR Scanner (requires HTTPS):"
    echo "  1. Access: https://$EC2_IP"
    echo "  2. Accept certificate warning"
    echo "  3. Or install certificate from: http://$EC2_IP/server.crt"
    echo ""
    echo "For regular inspection (no QR):"
    echo "  1. Access: http://$EC2_IP"
    echo ""
    echo "========================================="
    echo "🔑 SSH Access:"
    echo "========================================="
    echo "$(terraform output -raw ssh_command 2>/dev/null || echo 'SSH command not available')"
    echo ""
    echo "========================================="
    echo "💰 Cost Estimate:"
    echo "========================================="
    terraform output -raw monthly_cost_estimate 2>/dev/null || echo "Cost estimate not available"
    echo ""
    echo "========================================="
}

# ========================================
# Main
# ========================================
main() {
    echo ""
    log_info "Production Management System - AWS Deployment"
    echo ""

    check_prerequisites
    init_terraform
    deploy_infrastructure

    echo ""
    read -p "Do you want to upload application files and start services? (yes/no): " upload_confirm
    if [ "$upload_confirm" = "yes" ]; then
        upload_application
        setup_ssl
        init_database
        start_application
    fi

    echo ""
    show_outputs

    echo ""
    log_success "Deployment completed!"
}

main "$@"
