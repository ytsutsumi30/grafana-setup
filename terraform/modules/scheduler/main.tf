# ========================================
# Scheduler Module - Auto Start/Stop
# Using EventBridge Scheduler for EC2 and RDS
# ========================================

# IAM Role for EventBridge Scheduler
resource "aws_iam_role" "scheduler" {
  count = var.enable_scheduler ? 1 : 0
  name  = "${var.environment}-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-scheduler-role"
  }
}

# IAM Policy for EC2 and RDS operations
resource "aws_iam_role_policy" "scheduler" {
  count = var.enable_scheduler ? 1 : 0
  name  = "${var.environment}-scheduler-policy"
  role  = aws_iam_role.scheduler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:StartDBInstance",
          "rds:StopDBInstance",
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge Scheduler Group
resource "aws_scheduler_schedule_group" "main" {
  count = var.enable_scheduler ? 1 : 0
  name  = "${var.environment}-schedule-group"

  tags = {
    Name = "${var.environment}-schedule-group"
  }
}

# ========================================
# Start Schedules
# ========================================

# Start EC2 Instance
resource "aws_scheduler_schedule" "start_ec2" {
  count      = var.enable_scheduler ? 1 : 0
  name       = "${var.environment}-start-ec2"
  group_name = aws_scheduler_schedule_group.main[0].name

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.start_schedule
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
    role_arn = aws_iam_role.scheduler[0].arn

    input = jsonencode({
      InstanceIds = [var.ec2_instance_id]
    })
  }

  description = "Start EC2 instance for production management system"
}

# Start RDS Instance
resource "aws_scheduler_schedule" "start_rds" {
  count      = var.enable_scheduler ? 1 : 0
  name       = "${var.environment}-start-rds"
  group_name = aws_scheduler_schedule_group.main[0].name

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.start_schedule
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
    role_arn = aws_iam_role.scheduler[0].arn

    input = jsonencode({
      DbInstanceIdentifier = var.rds_instance_id
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 3600
    }
  }

  description = "Start RDS instance for production management system"
}

# ========================================
# Stop Schedules
# ========================================

# Stop EC2 Instance
resource "aws_scheduler_schedule" "stop_ec2" {
  count      = var.enable_scheduler ? 1 : 0
  name       = "${var.environment}-stop-ec2"
  group_name = aws_scheduler_schedule_group.main[0].name

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.stop_schedule
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
    role_arn = aws_iam_role.scheduler[0].arn

    input = jsonencode({
      InstanceIds = [var.ec2_instance_id]
    })
  }

  description = "Stop EC2 instance for production management system"
}

# Stop RDS Instance
resource "aws_scheduler_schedule" "stop_rds" {
  count      = var.enable_scheduler ? 1 : 0
  name       = "${var.environment}-stop-rds"
  group_name = aws_scheduler_schedule_group.main[0].name

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = var.stop_schedule
  schedule_expression_timezone = var.timezone

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.scheduler[0].arn

    input = jsonencode({
      DbInstanceIdentifier = var.rds_instance_id
    })

    retry_policy {
      maximum_retry_attempts       = 3
      maximum_event_age_in_seconds = 3600
    }
  }

  description = "Stop RDS instance for production management system"
}

# ========================================
# CloudWatch Alarms for Cost Monitoring
# ========================================

# EC2 Running Time Alarm
resource "aws_cloudwatch_metric_alarm" "ec2_running_time" {
  count               = var.enable_scheduler ? 1 : 0
  alarm_name          = "${var.environment}-ec2-running-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 3600
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when EC2 instance is running outside scheduled hours"
  treat_missing_data  = "notBreaching"

  dimensions = {
    InstanceId = var.ec2_instance_id
  }

  tags = {
    Name = "${var.environment}-ec2-running-alarm"
  }
}
