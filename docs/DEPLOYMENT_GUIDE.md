# Deployment Guide

**Version**: 2.1
**Last Updated**: 2025-10-18
**Target Environment**: AWS EC2 + RDS PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [AWS Deployment - Complete Workflow](#aws-deployment---complete-workflow)
4. [Terraform Execution Guide](#terraform-execution-guide)
5. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
6. [RDS Database Configuration](#rds-database-configuration)
7. [Rsync Deployment Configuration](#rsync-deployment-configuration)
8. [Application Deployment](#application-deployment)
9. [Verification and Testing](#verification-and-testing)
10. [Operations Management](#operations-management)
11. [Troubleshooting](#troubleshooting)
12. [Cost Management](#cost-management)

---

## Overview

This guide provides comprehensive instructions for deploying the Production Management System to AWS infrastructure using Terraform, including automated setup scripts and manual deployment procedures.

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AWS Cloud                        │
│  ┌──────────────┐         ┌──────────────┐        │
│  │   EC2 (t3)   │────────▶│ RDS PostgreSQL│        │
│  │              │         │   (db.t3)     │        │
│  │ - nginx      │         └──────────────┘        │
│  │ - Node.js API│                                  │
│  │ - Docker     │         ┌──────────────┐        │
│  └──────────────┘         │ EventBridge  │        │
│         ▲                 │  Scheduler   │        │
│         │                 │ (Auto Start) │        │
│  ┌──────┴──────┐         └──────────────┘        │
│  │   Client    │                                   │
│  │ (HTTP/HTTPS)│                                   │
│  └─────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

### Key Features

- **Infrastructure as Code**: Terraform manages all AWS resources
- **Auto-scaling**: EventBridge scheduler for cost optimization
- **Containerized**: Docker Compose for application services
- **Secure**: SSL/TLS encryption, RDS SSL connections
- **Automated**: One-command deployment with `aws-startup.sh`

### Monthly Cost Estimate (160 hours/month)

| Resource | Specification | Monthly Cost |
|----------|--------------|--------------|
| EC2 | t3.micro (160h) | $3-4 |
| RDS | db.t3.micro | $12-15 |
| EBS | 30GB | $3 |
| Elastic IP | Free when running | $0 |
| Data Transfer | ~1GB | $1-2 |
| **Total** | | **$19-24** |

---

## Prerequisites

### Required Tools

#### 1. Terraform (v1.0+)

```bash
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip
unzip terraform_1.7.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

#### 2. AWS CLI (v2+)

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

#### 3. rsync

```bash
# Usually pre-installed on Linux/macOS
which rsync

# Install if needed (Ubuntu/Debian)
sudo apt install rsync
```

### AWS Configuration

#### AWS Credentials Setup

```bash
aws configure
```

Enter the following:
- **AWS Access Key ID**: Your IAM user access key
- **AWS Secret Access Key**: Your IAM user secret key
- **Default region**: `ap-northeast-1` (Tokyo recommended)
- **Default output format**: `json`

**Verify Configuration**:
```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

#### SSH Key Pair Creation

**Option 1: AWS CLI**
```bash
aws ec2 create-key-pair \
  --key-name production-management-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-key.pem

chmod 400 ~/.ssh/production-management-key.pem
```

**Option 2: AWS Console**
1. Navigate to EC2 → Key Pairs
2. Click "Create key pair"
3. Name: `production-management-key`
4. Type: RSA
5. Format: .pem
6. Download and save to `~/.ssh/`
7. `chmod 400 ~/.ssh/production-management-key.pem`

---

## AWS Deployment - Complete Workflow

### Quickstart: 3-Step Deployment

#### Step 1: Prerequisites Check

```bash
cd /path/to/grafana-setup
./aws-startup.sh check
```

This validates:
- ✅ Terraform installed
- ✅ AWS CLI installed
- ✅ AWS credentials configured
- ✅ SSH key exists

#### Step 2: Configuration

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars
```

**Minimum Required Configuration**:
```hcl
# Project identification
project_name = "production-mgmt"
environment  = "poc"

# SSH Access - REQUIRED
key_name = "production-management-key"

# Database Password - REQUIRED (change this!)
db_password = "YourStrongPassword123!"

# IP Restriction - RECOMMENDED
allowed_cidr_blocks = [
  "YOUR_IP_ADDRESS/32"  # Get your IP: curl https://ifconfig.me
]

# Auto Start/Stop Schedule - OPTIONAL
enable_scheduler = true
start_schedule   = "cron(0 0 ? * MON-FRI *)"  # Monday-Friday 9:00 JST
stop_schedule    = "cron(0 10 ? * MON-FRI *)" # Monday-Friday 19:00 JST
```

**Get Your IP Address**:
```bash
curl https://ifconfig.me
```

#### Step 3: Full Deployment

```bash
cd /path/to/grafana-setup
./aws-startup.sh full-deploy
```

This command executes:
1. Infrastructure deployment (EC2, RDS, VPC, Security Groups)
2. Application file upload
3. Database initialization
4. SSL certificate generation
5. Docker container startup

**Duration**: 15-20 minutes

**Output Example**:
```
🌐 Deployment Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Access URLs:
  HTTP:  http://203.0.113.1
  HTTPS: https://203.0.113.1

SSH Access:
  ssh -i ~/.ssh/production-management-key.pem ec2-user@203.0.113.1

Cost Estimate: $19-24/month (160h)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step-by-Step Manual Deployment

For more control, you can execute each phase separately:

#### Phase 1: Setup

```bash
./aws-startup.sh setup
```

Initializes Terraform and creates template configuration file.

#### Phase 2: Infrastructure Deploy

```bash
./aws-startup.sh deploy
```

Creates AWS resources:
- VPC with public subnet
- Internet Gateway
- Security Groups
- EC2 instance (t3.micro)
- RDS PostgreSQL (db.t3.micro)
- EventBridge Scheduler

#### Phase 3: Application Upload

```bash
./aws-startup.sh upload
```

Transfers application files:
- `api/` - Node.js API server
- `web/` - Frontend files
- `nginx/` - Reverse proxy config
- `postgres/` - Database schemas
- `docker-compose.yml` - Container orchestration

#### Phase 4: Database Initialization

```bash
./aws-startup.sh init-db
```

Executes:
- `postgres/init/01-init.sql` - Core schema
- `postgres/init/02-qr-inspection-tables.sql` - QR inspection tables

#### Phase 5: Start Services

```bash
./aws-startup.sh start
```

Starts Docker containers and configures SSL.

---

## Terraform Execution Guide

### Directory Structure

```
terraform/
├── main.tf                 # Main configuration
├── variables.tf            # Variable definitions
├── outputs.tf              # Output values
├── terraform.tfvars        # Variable values (create this)
├── terraform.tfvars.example # Template
├── modules/
│   ├── ec2/               # EC2 instance module
│   ├── rds/               # RDS database module
│   ├── vpc/               # VPC networking module
│   └── scheduler/         # EventBridge scheduler module
└── deploy.sh              # Automated deployment script
```

### terraform.tfvars Configuration

```hcl
# ============================================
# Project Configuration
# ============================================
project_name = "production-mgmt"
environment  = "poc"

# ============================================
# EC2 Configuration
# ============================================
instance_type = "t3.micro"          # 1 vCPU, 1GB RAM
key_name      = "production-management-key"  # SSH key name

# ============================================
# RDS Configuration
# ============================================
db_instance_class = "db.t3.micro"   # 1 vCPU, 1GB RAM
db_name           = "production_db"
db_username       = "production_user"
db_password       = "ChangeThisPassword123!"  # CHANGE THIS!
db_storage        = 20                        # GB

# ============================================
# Network Configuration
# ============================================
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"

# IP whitelist for SSH/HTTP/HTTPS access
allowed_cidr_blocks = [
  "YOUR_IP_ADDRESS/32"  # Your IP address
]

# ============================================
# Scheduler Configuration
# ============================================
enable_scheduler = true

# UTC time (JST = UTC + 9)
# 9:00 JST = 0:00 UTC
start_schedule = "cron(0 0 ? * MON-FRI *)"

# 19:00 JST = 10:00 UTC
stop_schedule = "cron(0 10 ? * MON-FRI *)"

# ============================================
# Tags
# ============================================
tags = {
  Project     = "Production Management System"
  Environment = "POC"
  ManagedBy   = "Terraform"
}
```

### Terraform Commands

#### Initialize Terraform

```bash
cd terraform
terraform init
```

Performs:
- Downloads AWS provider
- Initializes modules
- Creates `.terraform/` directory

#### Plan Infrastructure Changes

```bash
terraform plan
```

Shows:
- Resources to be created
- Resources to be modified
- Resources to be destroyed

**Review carefully before applying!**

#### Apply Changes

```bash
terraform apply
```

Prompts for confirmation:
```
Do you want to perform these actions?
  Enter a value: yes
```

**Auto-approve (use with caution)**:
```bash
terraform apply -auto-approve
```

#### View Outputs

```bash
terraform output
```

Key outputs:
- `ec2_public_ip` - EC2 instance IP address
- `rds_endpoint` - RDS connection endpoint
- `application_url` - HTTP access URL
- `ssh_command` - SSH connection command

#### Destroy Infrastructure

```bash
terraform destroy
```

**WARNING**: This deletes all resources and data!

Use carefully and only when decommissioning.

### Terraform State Management

Terraform maintains infrastructure state in `terraform.tfstate`.

**Important**:
- ✅ **DO**: Backup `terraform.tfstate` regularly
- ❌ **DON'T**: Edit `terraform.tfstate` manually
- ❌ **DON'T**: Commit `terraform.tfstate` to Git (sensitive data)

**Refresh State**:
```bash
terraform refresh
```

**Import Existing Resource**:
```bash
terraform import aws_instance.main i-1234567890abcdef0
```

**List Resources**:
```bash
terraform state list
```

**Show Resource Details**:
```bash
terraform state show aws_instance.main
```

---

## SSL/TLS Certificate Setup

### Overview

The system uses self-signed SSL certificates for HTTPS support, which is required for camera access on iOS devices.

### Automatic SSL Setup

SSL certificates are automatically generated during deployment via `./aws-startup.sh full-deploy` or `./aws-startup.sh start`.

The setup script (`setup-ssl.sh`):
1. Detects EC2 public IP address
2. Generates self-signed certificate for the IP
3. Configures nginx with SSL
4. Enables HTTP to HTTPS redirect

### Manual SSL Certificate Generation

If you need to regenerate certificates:

```bash
# SSH to EC2
./aws-startup.sh ssh

# Navigate to project directory
cd /opt/production-management

# Generate SSL certificate
./setup-ssl.sh
```

**What the script does**:
```bash
# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create OpenSSL configuration
cat > ssl/openssl.cnf << EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = v3_req

[dn]
C  = JP
ST = Tokyo
L  = Tokyo
O  = Production Management System
OU = QR Inspection
CN = $PUBLIC_IP

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
IP.1 = $PUBLIC_IP
IP.2 = 127.0.0.1
DNS.1 = localhost
DNS.2 = *.compute.amazonaws.com
EOF

# Generate certificate
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -config ssl/openssl.cnf \
  -extensions v3_req

# Set permissions
chmod 600 ssl/server.key
chmod 644 ssl/server.crt
```

### nginx SSL Configuration

**File**: `nginx/conf.d/default.conf`

```nginx
# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    server_name _;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl;
    http2 on;
    server_name _;

    # SSL Certificate
    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Static files
    location / {
        root /var/www/html/web;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # API proxy
    location /api/ {
        proxy_pass http://production-api:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate Information

**View Certificate Details**:
```bash
openssl x509 -in ssl/server.crt -text -noout
```

**Key Information**:
- Subject: CN = EC2_PUBLIC_IP
- Issuer: Self-signed
- Valid: 365 days
- Key Size: 2048 bits
- Signature Algorithm: SHA256withRSA

### Browser Certificate Warnings

Self-signed certificates trigger browser warnings:

**Chrome/Edge**:
- "Your connection is not private"
- Click "Advanced" → "Proceed to site (unsafe)"

**Safari (macOS)**:
- "This connection is not private"
- Click "Show Details" → "visit this website"

**Safari (iOS)**:
- "This website may not be secure"
- Tap "Show Details" → "Visit this website"

### Production SSL Certificates

For production deployment, use a proper SSL certificate:

#### Option 1: Let's Encrypt (Free, Auto-renewal)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Obtain certificate (requires domain name)
sudo certbot --nginx -d your-domain.com
```

#### Option 2: AWS Certificate Manager (ACM)

1. Request certificate in ACM
2. Use with Application Load Balancer (ALB)
3. Configure ALB to forward to EC2

#### Option 3: Commercial SSL

Purchase from providers like:
- DigiCert
- GlobalSign
- Comodo

---

## RDS Database Configuration

### RDS Instance Specification

Created by Terraform with the following configuration:

```hcl
# terraform/modules/rds/main.tf
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = var.db_instance_class  # db.t3.micro

  allocated_storage = var.db_storage      # 20 GB
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.db_name       # production_db
  username = var.db_username   # production_user
  password = var.db_password   # from terraform.tfvars
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup
  backup_retention_period = 7
  backup_window          = "03:00-04:00"  # 12:00-13:00 JST
  maintenance_window     = "Mon:04:00-Mon:05:00"

  # SSL
  ca_cert_identifier = "rds-ca-2019"

  # Parameters
  parameter_group_name = aws_db_parameter_group.main.name

  # Deletion protection
  skip_final_snapshot    = true  # POC setting; false for production
  deletion_protection    = false  # POC setting; true for production

  tags = var.tags
}

# SSL Required Parameter
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-pg15"
  family = "postgres15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"  # SSL required
  }
}
```

### RDS Connection Configuration

#### Environment Variables

Automatically generated on EC2 in `api/.env`:

```bash
DB_HOST=poc-production-db.abc123.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=YourPassword123!
```

#### Node.js Connection (api/server.js)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'production_db',
    user: process.env.DB_USER || 'production_user',
    password: process.env.DB_PASSWORD || 'production_pass',

    // SSL Configuration - REQUIRED for RDS
    ssl: {
        rejectUnauthorized: false  // Accept RDS self-signed cert
    }
});

// Connection test
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('Database connection failed:', err);
    } else {
        logger.info('Database connected successfully:', res.rows[0].now);
    }
});
```

**Important**: `ssl: { rejectUnauthorized: false }` is required because RDS uses self-signed certificates by default.

#### Direct PostgreSQL Access

```bash
# SSH to EC2
./aws-startup.sh ssh

# Load environment variables
cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# Connect via Docker
docker run --rm -it \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### Database Schema Initialization

The system uses SQL scripts in `postgres/init/` for schema setup:

#### 01-init.sql - Core Schema

```sql
-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipping instructions
CREATE TABLE shipping_instructions (
    id SERIAL PRIMARY KEY,
    instruction_id VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    shipping_date DATE,
    customer_name VARCHAR(200),
    priority VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    available_stock INTEGER GENERATED ALWAYS AS
        (current_stock - reserved_stock) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO production_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO production_user;
```

#### 02-qr-inspection-tables.sql - QR Inspection

```sql
-- QR Inspections
CREATE TABLE qr_inspections (
    id SERIAL PRIMARY KEY,
    instruction_id INTEGER REFERENCES shipping_instructions(id),
    inspector_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    total_items INTEGER,
    scanned_items INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- QR Inspection Details
CREATE TABLE qr_inspection_details (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES qr_inspections(id),
    qr_code VARCHAR(200) NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO production_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO production_user;
```

#### Execute Initialization

Automatically executed during deployment, or manually:

```bash
./aws-startup.sh init-db
```

Or manually:
```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# Execute all SQL files
for sql_file in postgres/init/*.sql; do
    echo "Executing: $(basename $sql_file)"
    docker run --rm -i \
      -e PGPASSWORD=$DB_PASSWORD \
      postgres:15-alpine \
      psql -h $DB_HOST -U $DB_USER -d $DB_NAME < "$sql_file"
done
```

### Database Backup and Restore

#### Create Backup

**RDS Snapshot (AWS)**:
```bash
aws rds create-db-snapshot \
  --db-instance-identifier poc-production-db \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

**SQL Dump**:
```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d).sql
```

#### Restore Backup

**From RDS Snapshot**:
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier poc-production-db-restored \
  --db-snapshot-identifier manual-backup-20251018
```

**From SQL Dump**:
```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

docker run --rm -i \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_20251018.sql
```

---

## Rsync Deployment Configuration

### Quick Deploy Script

The `quick-deploy.sh` script provides fast, incremental deployments using rsync.

#### Basic Usage

```bash
# Standard deployment (sync files + restart services)
./quick-deploy.sh

# Full deployment (includes npm install)
./quick-deploy.sh --full

# Sync only (no restart)
./quick-deploy.sh --no-restart

# Restart only (no sync)
./quick-deploy.sh --restart
```

#### Rsync Configuration

**Excluded Files** (`.rsyncignore`):
```
node_modules/
.git/
terraform/
*.log
.env
ssl/server.key
*.tfstate*
.terraform/
github-pages/
```

**Sync Command**:
```bash
rsync -avz \
  --delete \
  --exclude-from=.rsyncignore \
  -e "ssh -i ~/.ssh/production-management-key.pem -o StrictHostKeyChecking=no" \
  /path/to/grafana-setup/ \
  ec2-user@$EC2_IP:/opt/production-management/
```

**Options Explained**:
- `-a`: Archive mode (preserves permissions, timestamps)
- `-v`: Verbose output
- `-z`: Compress during transfer
- `--delete`: Remove files on destination that don't exist on source
- `--exclude-from`: Use exclusion pattern file
- `-e`: Specify SSH command with key

### Deployment Scenarios

#### Code Changes Only

```bash
# Edit local files
vim web/app.js

# Deploy
./quick-deploy.sh

# Logs automatically shown
```

**Flow**:
1. Sync changed files to EC2
2. Restart Docker containers
3. Show deployment logs

**Time**: 3-10 seconds

#### Dependencies Changed (package.json)

```bash
# Edit dependencies
vim api/package.json

# Full deployment
./quick-deploy.sh --full
```

**Flow**:
1. Sync all files
2. SSH to EC2
3. Run `npm install` in API container
4. Restart containers

**Time**: 30-60 seconds

#### Configuration Changes Only

```bash
# Edit nginx config
vim nginx/conf.d/default.conf

# Sync without restart (manual restart required)
./quick-deploy.sh --no-restart

# SSH and restart nginx manually
./aws-startup.sh ssh
docker-compose restart nginx
```

**Use Case**: When you want to verify config before restarting

#### Service Recovery

```bash
# Restart services without file sync
./quick-deploy.sh --restart
```

**Use Case**: Service crashed, files unchanged

### Deployment Flow Diagram

```
Local Changes
    ↓
[quick-deploy.sh]
    ↓
Rsync to EC2
    ├─ Detect changed files
    ├─ Transfer compressed
    └─ Delete obsolete files
    ↓
EC2: /opt/production-management
    ↓
[Docker Compose]
    ├─ Stop containers
    ├─ Pull new images (if needed)
    ├─ Start containers
    └─ Health check
    ↓
[Verification]
    ├─ curl http://localhost/api/health
    └─ docker ps
    ↓
Deployment Complete ✅
```

### Advanced Rsync Options

#### Dry Run (Preview Changes)

```bash
rsync -avzn \
  --exclude-from=.rsyncignore \
  -e "ssh -i ~/.ssh/production-management-key.pem" \
  /path/to/grafana-setup/ \
  ec2-user@$EC2_IP:/opt/production-management/
```

`-n` flag shows what would be transferred without actually doing it.

#### Bandwidth Limit

```bash
rsync -avz \
  --bwlimit=1000 \  # KB/s
  ...
```

Useful for slow connections.

#### Progress Display

```bash
rsync -avz \
  --progress \
  ...
```

Shows progress for each file.

---

## Application Deployment

### Deployment Process Overview

```
[Preparation]
    ↓
[Infrastructure Setup]
  - Terraform Apply
  - AWS Resources Created
    ↓
[Application Upload]
  - Rsync Files to EC2
  - Generate .env File
    ↓
[Database Setup]
  - Execute Schema SQL
  - Load Initial Data
    ↓
[SSL Configuration]
  - Generate Certificates
  - Configure nginx
    ↓
[Docker Startup]
  - docker-compose up -d
  - Health Checks
    ↓
[Verification]
  - HTTP/HTTPS Access
  - API Tests
  - QR Scanner Test
```

### File Structure on EC2

```
/opt/production-management/
├── api/
│   ├── server.js
│   ├── package.json
│   ├── .env                    # Auto-generated
│   └── node_modules/
├── web/
│   ├── index.html
│   ├── js/
│   │   ├── index-app.js
│   │   └── qr-scanner.js
│   └── css/
├── nginx/
│   └── conf.d/
│       └── default.conf
├── postgres/
│   └── init/
│       ├── 01-init.sql
│       └── 02-qr-inspection-tables.sql
├── ssl/
│   ├── server.crt              # Auto-generated
│   └── server.key              # Auto-generated
├── docker-compose.yml
├── manage.sh
└── setup-ssl.sh
```

### Docker Compose Configuration

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: production-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./web:/var/www/html/web:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - production-api
    restart: unless-stopped

  production-api:
    build: ./api
    container_name: production-api
    env_file:
      - ./api/.env
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Monitoring stack
  grafana:
    image: grafana/grafana:latest
    container_name: production-grafana
    profiles: ["monitoring"]
    ports:
      - "3001:3000"
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    container_name: production-prometheus
    profiles: ["monitoring"]
    ports:
      - "9090:9090"
    restart: unless-stopped
```

### Service Management

#### Start All Services

```bash
./aws-startup.sh ssh
cd /opt/production-management
docker-compose up -d
```

#### Start with Monitoring

```bash
docker-compose --profile monitoring up -d
```

#### Check Service Status

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
production-nginx        Up 10 minutes       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
production-api          Up 10 minutes       0.0.0.0:3000->3000/tcp
```

#### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f production-api
docker-compose logs -f nginx
```

#### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart production-api
```

#### Stop Services

```bash
docker-compose down
```

---

## Verification and Testing

### Post-Deployment Checklist

After deployment, verify all components are working:

#### 1. Infrastructure Verification

```bash
# EC2 Status
aws ec2 describe-instances \
  --instance-ids $(cd terraform && terraform output -raw ec2_instance_id) \
  --query 'Reservations[0].Instances[0].State.Name'

# Expected: "running"

# RDS Status
aws rds describe-db-instances \
  --db-instance-identifier $(cd terraform && terraform output -raw rds_instance_id) \
  --query 'DBInstances[0].DBInstanceStatus'

# Expected: "available"
```

#### 2. SSH Connectivity

```bash
# Test SSH connection
./aws-startup.sh ssh

# Expected: Successful login to EC2
```

#### 3. Docker Services

```bash
./aws-startup.sh ssh

# Check all containers are running
docker ps

# Expected: nginx and production-api both "Up"
```

#### 4. HTTP/HTTPS Access

```bash
# Get EC2 IP
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)

# Test HTTP (should redirect to HTTPS)
curl -I http://$EC2_IP

# Expected: HTTP/1.1 301 Moved Permanently

# Test HTTPS
curl -k https://$EC2_IP

# Expected: HTML content of index.html
```

#### 5. API Health Check

```bash
curl -k https://$EC2_IP/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-18T10:30:00.000Z",
  "database": "connected"
}
```

#### 6. Database Connectivity

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# Test database connection
docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Expected:
# ?column?
#----------
#        1
```

#### 7. Data Retrieval Test

```bash
curl -k https://$EC2_IP/api/shipping-instructions?status=pending
```

Expected: JSON array of shipping instructions

#### 8. QR Scanner Test (iOS/Android)

1. Access `https://EC2_IP` on mobile device
2. Accept certificate warning
3. Navigate to QR inspection page
4. Click "QRスキャン開始"
5. Grant camera permission
6. Verify camera preview shows

✅ If all above pass, deployment is successful!

### Automated Verification Script

Create `verify-deployment.sh`:

```bash
#!/bin/bash

EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)
PASSED=0
FAILED=0

echo "🔍 Deployment Verification"
echo "=========================="

# Test 1: HTTP Redirect
echo -n "Test 1: HTTP to HTTPS redirect... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_IP)
if [ "$HTTP_CODE" = "301" ]; then
    echo "✅ PASSED"
    ((PASSED++))
else
    echo "❌ FAILED (Got $HTTP_CODE, expected 301)"
    ((FAILED++))
fi

# Test 2: HTTPS Access
echo -n "Test 2: HTTPS access... "
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k https://$EC2_IP)
if [ "$HTTPS_CODE" = "200" ]; then
    echo "✅ PASSED"
    ((PASSED++))
else
    echo "❌ FAILED (Got $HTTPS_CODE, expected 200)"
    ((FAILED++))
fi

# Test 3: API Health
echo -n "Test 3: API health check... "
API_RESPONSE=$(curl -s -k https://$EC2_IP/api/health)
if echo "$API_RESPONSE" | grep -q "\"status\":\"OK\""; then
    echo "✅ PASSED"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Test 4: Database Connection
echo -n "Test 4: Database connection... "
if echo "$API_RESPONSE" | grep -q "\"database\":\"connected\""; then
    echo "✅ PASSED"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Test 5: Docker Containers
echo -n "Test 5: Docker containers running... "
CONTAINERS=$(./aws-startup.sh ssh "docker ps --format '{{.Names}}' | wc -l")
if [ "$CONTAINERS" -ge 2 ]; then
    echo "✅ PASSED ($CONTAINERS containers)"
    ((PASSED++))
else
    echo "❌ FAILED (Only $CONTAINERS containers running)"
    ((FAILED++))
fi

echo ""
echo "=========================="
echo "Results: $PASSED passed, $FAILED failed"
echo "=========================="

if [ "$FAILED" -eq 0 ]; then
    echo "🎉 All tests passed! Deployment successful."
    exit 0
else
    echo "⚠️ Some tests failed. Please review the output above."
    exit 1
fi
```

Make executable and run:
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

---

## Operations Management

### Daily Operations

#### Start System (Morning)

```bash
./aws-startup.sh start
```

Starts:
- EC2 instance
- RDS database
- Docker containers

**Duration**: 2-3 minutes

#### Stop System (Evening - Cost Saving)

```bash
./aws-startup.sh stop
```

Stops:
- Docker containers
- EC2 instance
- RDS database

**Cost Savings**: ~75% when stopped 16h/day

#### Check System Status

```bash
./aws-startup.sh status
```

Shows:
- EC2 state (running/stopped)
- RDS state (available/stopped)
- Docker container status
- Access URLs

#### View Logs

```bash
./aws-startup.sh logs
```

Real-time tail of all Docker container logs.

Press `Ctrl+C` to exit.

### Scheduled Auto Start/Stop

Configured in `terraform.tfvars`:

```hcl
enable_scheduler = true

# Weekdays 9:00-19:00 JST
start_schedule = "cron(0 0 ? * MON-FRI *)"   # 9:00 JST
stop_schedule  = "cron(0 10 ? * MON-FRI *)"  # 19:00 JST
```

**Schedule Examples**:

**24/7 Operation**:
```hcl
enable_scheduler = false
```

**Weekend Shutdown**:
```hcl
start_schedule = "cron(0 15 ? * SUN *)"  # Monday 00:00 JST
stop_schedule  = "cron(0 15 ? * FRI *)"  # Saturday 00:00 JST
```

**Business Hours Only (8:00-18:00)**:
```hcl
start_schedule = "cron(0 23 ? * SUN-THU *)"  # 8:00 JST
stop_schedule  = "cron(0 9 ? * MON-FRI *)"   # 18:00 JST
```

Apply changes:
```bash
cd terraform
terraform apply
```

### Application Updates

#### Update Application Code

```bash
# 1. Edit files locally
vim web/app.js

# 2. Deploy changes
./quick-deploy.sh

# 3. Verify
curl -k https://$(cd terraform && terraform output -raw ec2_public_ip)/
```

#### Update Dependencies

```bash
# 1. Edit package.json
vim api/package.json

# 2. Full deployment
./quick-deploy.sh --full
```

#### Update nginx Configuration

```bash
# 1. Edit config
vim nginx/conf.d/default.conf

# 2. Deploy
./quick-deploy.sh

# 3. Restart nginx
./aws-startup.sh ssh
docker-compose restart nginx
```

### Database Operations

#### Export Data

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

# Full dump
docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup.sql

# Specific table
docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  pg_dump -h $DB_HOST -U $DB_USER -t shipping_instructions $DB_NAME > shipping.sql
```

#### Import Data

```bash
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

docker run --rm -i \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup.sql
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot SSH to EC2

**Symptoms**:
- `ssh: connect to host X.X.X.X port 22: Connection timed out`
- `./aws-startup.sh ssh` fails

**Possible Causes**:

**A. EC2 is stopped**
```bash
# Check status
./aws-startup.sh status

# Start if stopped
./aws-startup.sh start
```

**B. Security Group doesn't allow your IP**
```bash
# Check your IP
curl https://ifconfig.me

# Update terraform.tfvars
allowed_cidr_blocks = ["YOUR_IP/32"]

# Apply
cd terraform
terraform apply
```

**C. SSH key permissions**
```bash
# Fix permissions
chmod 400 ~/.ssh/production-management-key.pem

# Verify ownership
ls -l ~/.ssh/production-management-key.pem
```

**D. Wrong SSH key**
```bash
# Verify key name matches
cd terraform
terraform output | grep key_name

# Ensure it matches your key file name
```

#### Issue 2: Cannot Access Website (HTTP/HTTPS)

**Symptoms**:
- Browser shows "This site can't be reached"
- `curl http://EC2_IP` times out

**Diagnosis**:
```bash
# 1. EC2 running?
./aws-startup.sh status

# 2. nginx running?
./aws-startup.sh ssh
docker ps | grep nginx

# 3. Ports open in security group?
cd terraform
terraform output security_group_id

aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw security_group_id) \
  --query 'SecurityGroups[0].IpPermissions[*].[FromPort,ToPort,IpRanges]'
```

**Solutions**:

**A. Start EC2**
```bash
./aws-startup.sh start
```

**B. Restart nginx**
```bash
./aws-startup.sh ssh
docker-compose restart nginx
```

**C. Check nginx logs**
```bash
./aws-startup.sh ssh
docker-compose logs nginx
```

**D. Verify nginx config**
```bash
./aws-startup.sh ssh
docker exec production-nginx nginx -t
```

#### Issue 3: Database Connection Errors

**Symptoms**:
- API returns "Database connection failed"
- `/api/health` shows `"database": "error"`

**Diagnosis**:
```bash
# 1. RDS running?
aws rds describe-db-instances \
  --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].DBInstanceStatus'

# 2. Test connection from EC2
./aws-startup.sh ssh

cd /opt/production-management
export $(grep -v '^#' api/.env | xargs)

docker run --rm \
  -e PGPASSWORD=$DB_PASSWORD \
  postgres:15-alpine \
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

**Solutions**:

**A. Start RDS**
```bash
aws rds start-db-instance --db-instance-identifier poc-production-db
```

**B. Verify credentials**
```bash
./aws-startup.sh ssh
cat api/.env

# Compare with terraform.tfvars
cd terraform
grep db_password terraform.tfvars
```

**C. Check SSL configuration**

Ensure `api/server.js` has SSL enabled:
```javascript
const pool = new Pool({
    // ...
    ssl: {
        rejectUnauthorized: false
    }
});
```

**D. RDS security group**
```bash
# Ensure EC2 security group can access RDS
aws rds describe-db-instances \
  --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].VpcSecurityGroups'
```

#### Issue 4: QR Scanner Not Working on iOS

**Symptoms**:
- Camera doesn't start
- "BarcodeDetector API unavailable" error

**Solutions**:

**A. Ensure HTTPS**
```bash
# iOS requires HTTPS for camera access
# Verify SSL certificate is configured
./aws-startup.sh ssh
ls -la ssl/server.crt ssl/server.key
```

**B. Clear iOS Safari cache**
- Settings → Safari → Clear History and Website Data

**C. Accept certificate**
- Browse to https://EC2_IP
- Tap "Show Details" → "Visit this website"

**D. Grant camera permission**
- When prompted, tap "Allow" for camera access

#### Issue 5: Deployment Fails

**Symptoms**:
- `terraform apply` shows errors
- Resources fail to create

**Common Terraform Errors**:

**A. "Error creating DB Instance: DBInstanceAlreadyExists"**
```bash
# Import existing instance
cd terraform
terraform import module.rds.aws_db_instance.main poc-production-db
```

**B. "Error launching source instance: InvalidKeyPair.NotFound"**
```bash
# Verify key exists
aws ec2 describe-key-pairs --key-names production-management-key

# If not, create it
aws ec2 create-key-pair \
  --key-name production-management-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/production-management-key.pem
```

**C. "Error creating Security Group: duplicate"**
```bash
# Remove from state and re-import
terraform state rm module.vpc.aws_security_group.main
terraform import module.vpc.aws_security_group.main sg-xxxxx
```

**D. Terraform state lock**
```bash
# If state is locked
cd terraform
terraform force-unlock LOCK_ID
```

#### Issue 6: High Costs

**Symptoms**:
- AWS bill higher than expected

**Investigation**:
```bash
# Check running resources
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]'

aws rds describe-db-instances \
  --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceClass,DBInstanceStatus]'

# Check for unused Elastic IPs
aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=" \
  --query 'Addresses[*].PublicIp'
```

**Solutions**:

**A. Enable scheduler**
```hcl
# terraform.tfvars
enable_scheduler = true
start_schedule = "cron(0 0 ? * MON-FRI *)"
stop_schedule = "cron(0 10 ? * MON-FRI *)"
```

**B. Stop when not in use**
```bash
./aws-startup.sh stop
```

**C. Downsize instances**
```hcl
instance_type = "t3.micro"       # Instead of t3.small
db_instance_class = "db.t3.micro" # Instead of db.t3.small
```

**D. Delete unused resources**
```bash
# Delete the entire stack if not needed
./aws-startup.sh destroy
```

### Log Analysis

#### Check API Logs

```bash
./aws-startup.sh ssh
docker-compose logs -f production-api | grep ERROR
```

#### Check nginx Access Logs

```bash
./aws-startup.sh ssh
docker exec production-nginx tail -f /var/log/nginx/access.log
```

#### Check nginx Error Logs

```bash
./aws-startup.sh ssh
docker exec production-nginx tail -f /var/log/nginx/error.log
```

#### CloudWatch Logs (if configured)

```bash
# RDS logs
aws logs tail /aws/rds/instance/poc-production-db/postgresql --follow

# EC2 logs (if CloudWatch agent installed)
aws logs tail /aws/ec2/production-management --follow
```

---

## Cost Management

### Cost Tracking

#### View Current Month Cost

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://cost-filter.json
```

**cost-filter.json**:
```json
{
  "Tags": {
    "Key": "Environment",
    "Values": ["poc"]
  }
}
```

#### Resource-Specific Costs

```bash
# EC2 costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon Elastic Compute Cloud - Compute"]
    }
  }'

# RDS costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon Relational Database Service"]
    }
  }'
```

### Cost Optimization Strategies

#### 1. Auto Start/Stop Schedule

**Impact**: ~75% cost reduction

```hcl
# terraform.tfvars
enable_scheduler = true

# Weekdays only (40h/week vs 168h/week)
start_schedule = "cron(0 0 ? * MON *)"     # Monday 9:00 JST
stop_schedule  = "cron(0 10 ? * FRI *)"    # Friday 19:00 JST
```

**Before**: $20/month (24/7)
**After**: $5/month (40h/week)

#### 2. Right-Sizing Instances

For development/testing:
```hcl
instance_type = "t3.micro"        # $0.0104/hour
db_instance_class = "db.t3.micro" # $0.017/hour
```

For production (if needed):
```hcl
instance_type = "t3.small"        # $0.0208/hour
db_instance_class = "db.t3.small" # $0.034/hour
```

#### 3. Reserved Instances (Long-term)

For 1-year commitment:
- EC2 RI: ~40% savings
- RDS RI: ~35% savings

Purchase via AWS Console → EC2/RDS → Reserved Instances

#### 4. Spot Instances (Non-critical workloads)

**Not recommended for this system** as it requires continuous availability.

#### 5. Storage Optimization

```hcl
# Reduce RDS storage if not needed
db_storage = 20  # GB (minimum 20)
```

Monitor actual usage:
```bash
aws rds describe-db-instances \
  --db-instance-identifier poc-production-db \
  --query 'DBInstances[0].[AllocatedStorage,MaxAllocatedStorage]'
```

### Budget Alerts

Set up AWS Budget alerts:

```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

**budget.json**:
```json
{
  "BudgetName": "production-management-poc",
  "BudgetLimit": {
    "Amount": "30",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

**notifications.json**:
```json
[
  {
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [
      {
        "SubscriptionType": "EMAIL",
        "Address": "your-email@example.com"
      }
    ]
  }
]
```

### Monthly Cost Review

Create a monthly review routine:

```bash
#!/bin/bash
# monthly-cost-review.sh

echo "=== Monthly Cost Review ==="
echo "Month: $(date +%Y-%m)"
echo ""

# Total cost this month
echo "Total Cost:"
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --output table

echo ""
echo "Service Breakdown:"
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE \
  --output table

echo ""
echo "=== Recommendations ==="
echo "- If cost > $30: Consider reducing instance sizes or uptime"
echo "- If unused: Run ./aws-startup.sh destroy to delete all resources"
```

Run monthly:
```bash
chmod +x monthly-cost-review.sh
./monthly-cost-review.sh
```

---

## Appendix A: Complete Command Reference

### aws-startup.sh Commands

```bash
./aws-startup.sh check          # Prerequisites check
./aws-startup.sh setup          # Terraform initialization
./aws-startup.sh deploy         # Deploy infrastructure
./aws-startup.sh full-deploy    # Full deployment (infra + app)
./aws-startup.sh start          # Start EC2/RDS
./aws-startup.sh stop           # Stop EC2/RDS
./aws-startup.sh restart        # Restart EC2/RDS
./aws-startup.sh status         # Show system status
./aws-startup.sh ssh            # SSH to EC2
./aws-startup.sh logs           # View Docker logs
./aws-startup.sh upload         # Upload files to EC2
./aws-startup.sh init-db        # Initialize database
./aws-startup.sh cost           # Show cost estimate
./aws-startup.sh backup         # Create RDS snapshot
./aws-startup.sh destroy        # Delete all resources
./aws-startup.sh help           # Show help
```

### quick-deploy.sh Commands

```bash
./quick-deploy.sh               # Standard deployment
./quick-deploy.sh --full        # Full deployment (with npm install)
./quick-deploy.sh --no-restart  # Sync only, no restart
./quick-deploy.sh --restart     # Restart only, no sync
./quick-deploy.sh --help        # Show help
```

### Terraform Commands

```bash
cd terraform

terraform init                  # Initialize
terraform plan                  # Preview changes
terraform apply                 # Apply changes
terraform destroy               # Destroy all
terraform output                # Show outputs
terraform state list            # List resources
terraform state show RESOURCE   # Show resource details
terraform refresh               # Refresh state
```

### Docker Commands (on EC2)

```bash
docker ps                       # List running containers
docker ps -a                    # List all containers
docker logs CONTAINER           # View logs
docker exec -it CONTAINER sh    # Enter container shell
docker-compose up -d            # Start all services
docker-compose down             # Stop all services
docker-compose restart          # Restart all services
docker-compose logs -f          # Tail all logs
```

---

## Appendix B: Configuration Templates

### terraform.tfvars Template

```hcl
# ============================================
# Project Configuration
# ============================================
project_name = "production-mgmt"
environment  = "poc"

# ============================================
# EC2 Configuration
# ============================================
instance_type = "t3.micro"
key_name      = "production-management-key"

# ============================================
# RDS Configuration
# ============================================
db_instance_class = "db.t3.micro"
db_name           = "production_db"
db_username       = "production_user"
db_password       = "CHANGE_THIS_PASSWORD"
db_storage        = 20

# ============================================
# Network Configuration
# ============================================
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"

allowed_cidr_blocks = [
  "0.0.0.0/0"  # CHANGE TO YOUR IP
]

# ============================================
# Scheduler Configuration
# ============================================
enable_scheduler = true
start_schedule   = "cron(0 0 ? * MON-FRI *)"
stop_schedule    = "cron(0 10 ? * MON-FRI *)"

# ============================================
# Tags
# ============================================
tags = {
  Project     = "Production Management System"
  Environment = "POC"
  ManagedBy   = "Terraform"
}
```

### .env Template (Generated on EC2)

```bash
# Database Configuration
DB_HOST=poc-production-db.xxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=production_user
DB_PASSWORD=YourPassword123

# API Configuration
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info
```

---

## Appendix C: Related Documentation

### System Documentation
- `/home/user/grafana-setup/docs/QR_SCANNER_GUIDE.md` - QR Scanner Implementation
- `/home/user/grafana-setup/docs/QR_INSPECTION_GUIDE.md` - QR Inspection System
- `/home/user/grafana-setup/docs/SAFARI_IOS_OPTIMIZATION.md` - Safari/iOS Optimization
- `/home/user/grafana-setup/CLAUDE.md` - System Overview for Claude

### External Resources
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [AWS RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx Documentation](https://nginx.org/en/docs/)

---

**Document Version:** 2.1
**Last Updated:** 2025-10-18
**Maintained By:** System Development Team
**Status:** Production
