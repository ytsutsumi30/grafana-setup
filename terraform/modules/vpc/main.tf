# ========================================
# VPC Module - Single-AZ Configuration
# ========================================

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnets (1 for single-AZ, 2 for ALB multi-AZ)
resource "aws_subnet" "public" {
  count                   = var.enable_alb ? 2 : 1
  vpc_id                  = aws_vpc.main.id
  cidr_block              = count.index == 0 ? var.public_subnet_cidr : cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone       = count.index == 0 ? var.availability_zone : "ap-northeast-1c"
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${count.index + 1}"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  count          = var.enable_alb ? 2 : 1
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
