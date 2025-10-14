variable "environment" {
  description = "Environment name"
  type        = string
}

variable "ec2_instance_id" {
  description = "EC2 Instance ID to schedule"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS Instance ID to schedule"
  type        = string
}

variable "start_schedule" {
  description = "Cron expression for start schedule"
  type        = string
}

variable "stop_schedule" {
  description = "Cron expression for stop schedule"
  type        = string
}

variable "timezone" {
  description = "Timezone for schedules"
  type        = string
}

variable "enable_scheduler" {
  description = "Enable auto start/stop scheduler"
  type        = bool
}
