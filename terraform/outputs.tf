# ========================================
# Outputs
# ========================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = module.ec2.instance_id
}

output "ec2_public_ip" {
  description = "EC2 Public IP Address"
  value       = module.ec2.public_ip
}

output "application_url" {
  description = "Application URL"
  value       = "http://${module.ec2.public_ip}"
}

output "grafana_url" {
  description = "Grafana URL"
  value       = "http://${module.ec2.public_ip}/grafana/"
}

output "ssh_command" {
  description = "SSH command to connect to EC2"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${module.ec2.public_ip}"
}

output "rds_endpoint" {
  description = "RDS Endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}

output "rds_instance_id" {
  description = "RDS Instance ID"
  value       = module.rds.db_instance_id
}

output "scheduler_start_time" {
  description = "Scheduled start time (UTC)"
  value       = var.start_schedule
}

output "scheduler_stop_time" {
  description = "Scheduled stop time (UTC)"
  value       = var.stop_schedule
}

output "monthly_cost_estimate" {
  description = "Estimated monthly cost (USD)"
  value       = <<-EOT
    EC2 t3.micro (160h/month): ~$3-4
    RDS db.t3.micro: ~$12-15
    EBS 30GB: ~$3
    Data Transfer: ~$1-2
    Total: ~$19-24/month

    Note: Cost assumes ~160 hours/month runtime with scheduler
    Full month without scheduler: ~$30-35
  EOT
}
