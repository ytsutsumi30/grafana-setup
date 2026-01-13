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
public_subnet_cidr = "10.0.1.0/24"

# Security - IMPORTANT: Restrict in production!
allowed_cidr_blocks = [
  "0.0.0.0/0"  # Allow from anywhere (POC only)
  # "YOUR_IP/32"  # Recommended: Use your specific IP
]

# EC2 Configuration
instance_type = "t3.micro"  # ~$7.5/month (upgrade to t3.small if needed)
key_name      = "production-management-key"  # SSH key pair created

# RDS Configuration
db_instance_class    = "db.t3.micro"  # ~$12-15/month
db_allocated_storage = 20
db_name              = "production_db"
db_user              = "production_user"
db_password          = "ChangeThisPassword123!"  # CHANGE THIS!

# Auto Start/Stop Scheduler
enable_scheduler = false

# Domain Configuration
domain_name                = "hispot-iot.com"
enable_alb                 = true
manage_domain_nameservers  = true

# Schedule times with Asia/Tokyo timezone
# Start at 9:00 AM JST (Mon-Fri), Stop at 7:00 PM JST (Mon-Fri)
start_schedule = "cron(0 9 ? * MON-FRI *)"   # 9:00 AM JST (Mon-Fri)
stop_schedule  = "cron(0 19 ? * MON-FRI *)"  # 7:00 PM JST (Mon-Fri)

timezone = "Asia/Tokyo"

# ========================================
# Common Schedule Examples (with Asia/Tokyo timezone):
# ========================================
# Business hours (9AM-6PM JST, Mon-Fri):
#   start_schedule = "cron(0 9 ? * MON-FRI *)"   # 9:00 AM JST
#   stop_schedule  = "cron(0 18 ? * MON-FRI *)"  # 6:00 PM JST
#
# Extended hours (8AM-8PM JST, Mon-Fri):
#   start_schedule = "cron(0 8 ? * MON-FRI *)"   # 8:00 AM JST
#   stop_schedule  = "cron(0 20 ? * MON-FRI *)"  # 8:00 PM JST
#
# Extended hours (9AM-9PM JST, Mon-Fri):
#   start_schedule = "cron(0 9 ? * MON-FRI *)"   # 9:00 AM JST
#   stop_schedule  = "cron(0 21 ? * MON-FRI *)"  # 9:00 PM JST
#
# Weekday only (Mon 8AM - Sat 12AM):
#   start_schedule = "cron(0 8 ? * MON *)"       # Mon 8:00 AM JST
#   stop_schedule  = "cron(0 0 ? * SAT *)"       # Sat 12:00 AM JST
# ========================================

# ========================================
# GCP Configuration (Hybrid OCR)
# ========================================

# Enable hybrid OCR mode (AWS Textract + GCP Document AI)
enable_hybrid_ocr = false  # Set to true to enable GCP Document AI

# GCP Project Configuration (required when enable_hybrid_ocr = true)
gcp_project_id = ""  # Your GCP project ID
gcp_region     = "us"  # Document AI region: us, eu, asia-northeast1

# Document AI Processor ID (optional - created automatically if empty)
documentai_processor_id = ""

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
