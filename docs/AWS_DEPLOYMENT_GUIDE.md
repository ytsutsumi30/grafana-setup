# AWS Deployment Guide

**Version**: 2.0
**Last Updated**: 2025-11-23
**Consolidation**: 6 AWS deployment documents

---

## Quick Start (5 Minutes)

### Prerequisites
- AWS Account
- Terraform installed
- SSH key pair

### Deploy Commands

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings
terraform init
terraform plan
terraform apply
```

---

## Detailed Setup

### 1. Configure terraform.tfvars

```hcl
aws_region          = "us-east-1"
environment         = "production"
ssh_key_name        = "your-key-name"
db_password         = "SecurePassword123!"
domain_name         = "hispot-iot.com"  # Optional
enable_scheduler    = true
```

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Plan Deployment

```bash
terraform plan
```

### 4. Apply Configuration

```bash
terraform apply
```

### 5. Access System

Terraform outputs the application URL and SSH command:

```
Application URL: http://YOUR_EC2_IP
SSH Command: ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

---

## Architecture

### Infrastructure Components

- **VPC**: Single AZ (default) or Multi-AZ (with ALB)
- **EC2**: Amazon Linux 2023, t3.micro, 30GB EBS
- **RDS**: PostgreSQL 15, db.t3.micro, 20GB
- **ALB**: Application Load Balancer (optional, with domain)
- **Route53**: DNS management (with domain)
- **Scheduler**: Auto start/stop (9:00-19:00 JST)

### Cost Optimization

- **Monthly Cost**: $19-24 with scheduler
- **Auto-scheduler**: Weekday 9:00-19:00 JST
- **Instance Types**: t3.micro for POC environment

---

## SSL/TLS Configuration

### Self-Signed Certificate

Located in `ssl/` directory:
- `server.crt`: Certificate
- `server.key`: Private key

### HTTPS Access

```
https://YOUR_DOMAIN
https://YOUR_EC2_IP
```

---

## RDS Configuration

### PostgreSQL 15 Setup

- **Instance Class**: db.t3.micro
- **Storage**: 20GB, auto-scaling enabled
- **Backup**: 7 days retention
- **Monitoring**: CloudWatch logs enabled

### SSL Connection

RDS is configured with SSL/TLS encryption for secure database connections.

---

## Deployment with rsync

### quick-deploy.sh Script

```bash
#!/bin/bash
./quick-deploy.sh
```

This script:
1. Syncs local files to EC2
2. Restarts Docker containers
3. Verifies deployment

---

## Monitoring

### EventBridge Scheduler

- **Start**: 9:00 JST (Weekdays)
- **Stop**: 19:00 JST (Weekdays)
- **Timezone**: Asia/Tokyo

### CloudWatch

- RDS metrics
- EC2 metrics
- Application logs

---

## Troubleshooting

### SSH Connection Issues

```bash
# Verify security group allows SSH (port 22)
# Check key permissions
chmod 400 your-key.pem
```

### Database Connection Issues

```bash
# Check RDS security group
# Verify SSL configuration
# Test connection from EC2
```

### Application Not Accessible

```bash
# Check EC2 instance status
# Verify nginx is running
docker-compose ps
# Check security group allows HTTP/HTTPS
```

---

## Maintenance

### Backup Database

```bash
docker-compose exec postgres pg_dump -U production_user production_db > backup.sql
```

### Update Application

```bash
./quick-deploy.sh
```

### Scale Resources

Edit `terraform.tfvars` and run:

```bash
terraform apply
```

---

##Related Documentation

- **Terraform README**: `/terraform/README.md`
- **Cost Optimization**: `/md/terraform/COST_OPTIMIZATION.md`
- **Quick Start**: `/md/terraform/QUICK_START.md`
- **Deploy Guide**: `/md/terraform/DEPLOY_GUIDE.md`

---

## Source Files

This document consolidates:
- `doc/aws/AWS_DEPLOYMENT.md` (774 lines)
- `doc/aws/AWS_DEPLOYMENT_GUIDE.md` (726 lines)
- `doc/aws/AWS_STARTUP_GUIDE.md` (587 lines)
- `doc/aws/AWS_README.md` (267 lines)
- `doc/aws/AWS_QUICKSTART.md` (110 lines)
- `doc/aws/QUICKSTART_AWS.md` (92 lines)

**Total**: 2,556 lines consolidated
