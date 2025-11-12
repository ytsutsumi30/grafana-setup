# ========================================
# Terraform Variables - Example Configuration
# Copy this file to terraform.tfvars and update values
# ========================================

# AWS Configuration
aws_region        = "ap-northeast-1"
environment       = "poc"
availability_zone = "ap-northeast-1a"

# Network Configuration
vpc_cidr           = "10.0.0.0/16"
public_subnet_cidr = "10.0.1.0/24"  # Deprecated: Use public_subnet_cidrs for multi-AZ

# Multi-AZ Configuration (for ALB support)
availability_zones  = ["ap-northeast-1a", "ap-northeast-1c"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.3.0/24"]

# Security - IMPORTANT: Restrict in production!
allowed_cidr_blocks = [
  "0.0.0.0/0"  # Allow from anywhere (POC only)
  # "YOUR_IP/32"  # Recommended: Use your specific IP
]

# EC2 Configuration
instance_type = "t3.micro"  # ~$7.5/month (upgrade to t3.small if needed)
key_name      = "production-management-key"
ami_id        = "ami-0244ef75e95122fd9"  # Ubuntu 22.04 LTS (2025-10-15)

# RDS Configuration
db_instance_class    = "db.t3.micro"  # ~$12-15/month
db_allocated_storage = 20
db_name              = "production_db"
db_user              = "production_user"
db_password          = "ChangeThisPassword123!"  # CHANGE THIS!

# Auto Start/Stop Scheduler
enable_scheduler = true

# Schedule times (in UTC - adjust for your timezone)
# JST = UTC+9, so 00:00 UTC = 09:00 JST
start_schedule = "cron(0 0 ? * MON-FRI *)"   # 9:00 AM JST (Mon-Fri)
stop_schedule  = "cron(0 10 ? * MON-FRI *)"  # 7:00 PM JST (Mon-Fri)

timezone = "Asia/Tokyo"

# ========================================
# Common Schedule Examples:
# ========================================
# Business hours (9AM-6PM JST, Mon-Fri):
#   start_schedule = "cron(0 0 ? * MON-FRI *)"   # 9:00 AM JST
#   stop_schedule  = "cron(0 9 ? * MON-FRI *)"   # 6:00 PM JST
#
# Extended hours (8AM-8PM JST, Mon-Fri):
#   start_schedule = "cron(0 23 ? * SUN-THU *)"  # 8:00 AM JST
#   stop_schedule  = "cron(0 11 ? * MON-FRI *)"  # 8:00 PM JST
#
# Weekday only (24h on weekdays, off on weekends):
#   start_schedule = "cron(0 15 ? * SUN *)"      # Mon 00:00 JST
#   stop_schedule  = "cron(0 15 ? * FRI *)"      # Sat 00:00 JST
# ========================================

# ========================================
# ALB Configuration (Application Load Balancer)
# ========================================

# Enable ALB for production deployments with SSL/TLS
enable_alb = false  # Disabled - using direct EC2 access

# Enable SSL/TLS (requires domain_name and Route53 hosted zone)
enable_ssl = false

# Your domain name (FQDN)
# domain_name = "hispot-iot.com"

# Route53 Hosted Zone ID
# route53_zone_id = "Z0225560EJ0N53SI7ZU2"

# Create ACM certificate automatically
# create_certificate = true

# Optional: Provide existing ACM certificate ARN
# If not provided, Terraform will create a new certificate and validate via Route53 DNS
# certificate_arn = "arn:aws:acm:ap-northeast-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# SSL Policy (AWS Predefined Security Policy)
# Recommended: "ELBSecurityPolicy-TLS13-1-2-2021-06" for modern clients
ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"

# ALB idle timeout (seconds)
# alb_idle_timeout = 60

# Enable cross-zone load balancing
# alb_cross_zone_enabled = true

# ========================================
# ALB Deployment Scenarios:
# ========================================
# 
# Scenario 1: Simple EC2 Deployment (Development/POC)
# ---------------------------------------------------
# enable_alb = false
# enable_ssl = false
# Access via: http://<EC2_PUBLIC_IP>
# Cost: ~$23/month (EC2 + RDS)
# 
# Scenario 2: ALB without SSL (HTTP only)
# ---------------------------------------------------
# enable_alb = true
# enable_ssl = false
# domain_name = "dev.example.com"  # Optional
# Access via: http://<ALB_DNS_NAME> or http://dev.example.com
# Cost: ~$40/month (EC2 + RDS + ALB)
# 
# Scenario 3: ALB with SSL (HTTPS) - RECOMMENDED FOR PRODUCTION
# ---------------------------------------------------
# enable_alb = true
# enable_ssl = true
# domain_name = "app.example.com"
# Access via: https://app.example.com
# Cost: ~$40/month (EC2 + RDS + ALB, ACM certificate is FREE)
# PREREQUISITES:
#   - Route53 hosted zone for "example.com" must exist ($0.50/month)
#   - Terraform will create DNS validation records automatically
# 
# Scenario 4: ALB with existing SSL certificate
# ---------------------------------------------------
# enable_alb = true
# enable_ssl = true
# domain_name = "app.example.com"
# certificate_arn = "arn:aws:acm:ap-northeast-1:123456789012:certificate/xxxxx"
# Use this if you already have a validated ACM certificate
# ========================================

# ========================================
# GCP Configuration (Hybrid OCR)
# ========================================

# Enable hybrid OCR mode (AWS Textract + GCP Document AI)
enable_hybrid_ocr = true

# GCP Project Configuration
gcp_project_id = "577010681495"
gcp_region     = "us"

# Document AI Processor ID (created manually in GCP Console)
documentai_processor_id = "88e298617b1abfea"

# GCP Credentials (optional - uses GOOGLE_APPLICATION_CREDENTIALS env var if not set)
# gcp_credentials_file = "/path/to/service-account-key.json"

# OCR Configuration
ocr_default_engine       = "textract"    # Primary OCR engine: "textract" or "documentai"
ocr_confidence_threshold = 85            # Fallback threshold (0-100)

# ========================================
# Hybrid OCR Mode Notes:
# ========================================
# - enable_hybrid_ocr=true: Enables AWS Textract + GCP Document AI
# - ocr_default_engine: Primary OCR engine to try first
# - If confidence < threshold, fallback to alternative engine
# - Cost: AWS Textract ~$1.50/1000 pages, GCP Document AI ~$1.50/1000 pages
# - GCP offers 1000 pages/month free tier
# ========================================
