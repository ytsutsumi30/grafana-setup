output "scheduler_role_arn" {
  description = "IAM Role ARN for EventBridge Scheduler"
  value       = var.enable_scheduler ? aws_iam_role.scheduler[0].arn : null
}

output "start_schedule_arn" {
  description = "Start schedule ARN"
  value       = var.enable_scheduler ? aws_scheduler_schedule.start_ec2[0].arn : null
}

output "stop_schedule_arn" {
  description = "Stop schedule ARN"
  value       = var.enable_scheduler ? aws_scheduler_schedule.stop_ec2[0].arn : null
}
