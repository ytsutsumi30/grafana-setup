# ========================================
# Production Management System - POC Environment
# Single-AZ EC2 + Docker Compose Configuration
# Budget: $20-30/month with auto start/stop
# ========================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state (recommended)
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "production-management/poc/terraform.tfstate"
  #   region = "ap-northeast-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ProductionManagement"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "POC"
    }
  }
}

# ========================================
# VPC Module
# ========================================
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zone  = var.availability_zone
  public_subnet_cidr = var.public_subnet_cidr
}

# ========================================
# EC2 Module
# ========================================
module "ec2" {
  source = "./modules/ec2"

  environment           = var.environment
  vpc_id               = module.vpc.vpc_id
  public_subnet_id     = module.vpc.public_subnet_id
  instance_type        = var.instance_type
  key_name             = var.key_name
  db_host              = module.rds.db_endpoint
  db_name              = var.db_name
  db_user              = var.db_user
  db_password          = var.db_password
  allowed_cidr_blocks  = var.allowed_cidr_blocks
}

# ========================================
# RDS Module
# ========================================
module "rds" {
  source = "./modules/rds"

  environment          = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_id    = module.vpc.public_subnet_id
  db_name             = var.db_name
  db_user             = var.db_user
  db_password         = var.db_password
  instance_class      = var.db_instance_class
  allocated_storage   = var.db_allocated_storage
  ec2_security_group_id = module.ec2.security_group_id
}

# ========================================
# Scheduler Module (Auto Start/Stop)
# ========================================
module "scheduler" {
  source = "./modules/scheduler"

  environment       = var.environment
  ec2_instance_id   = module.ec2.instance_id
  rds_instance_id   = module.rds.db_instance_id
  start_schedule    = var.start_schedule
  stop_schedule     = var.stop_schedule
  timezone          = var.timezone
  enable_scheduler  = var.enable_scheduler
}
