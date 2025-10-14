# ========================================
# Variables
# ========================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "poc"
}

variable "availability_zone" {
  description = "Availability Zone for single-AZ deployment"
  type        = string
  default     = "ap-northeast-1a"
}

# ========================================
# Network Configuration
# ========================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # WARNING: Restrict in production
}

# ========================================
# EC2 Configuration
# ========================================

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"  # ~$7.5/month, upgrade to t3.small if needed
}

variable "key_name" {
  description = "shipping-key"
  type        = string
}

# ========================================
# RDS Configuration
# ========================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # ~$12-15/month
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "production_db"
}

variable "db_user" {
  description = "Database username"
  type        = string
  default     = "production_user"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# ========================================
# Auto Start/Stop Scheduler
# ========================================

variable "enable_scheduler" {
  description = "Enable auto start/stop scheduler"
  type        = bool
  default     = true
}

variable "start_schedule" {
  description = "Cron expression for start schedule (UTC)"
  type        = string
  default     = "cron(0 0 ? * MON-FRI *)"  # 9:00 AM JST (Mon-Fri)
}

variable "stop_schedule" {
  description = "Cron expression for stop schedule (UTC)"
  type        = string
  default     = "cron(0 10 ? * MON-FRI *)"  # 7:00 PM JST (Mon-Fri)
}

variable "timezone" {
  description = "Timezone for schedules"
  type        = string
  default     = "Asia/Tokyo"
}
