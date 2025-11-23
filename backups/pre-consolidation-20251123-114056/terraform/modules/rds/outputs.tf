output "db_instance_id" {
  description = "RDS Instance ID"
  value       = aws_db_instance.postgresql.id
}

output "db_endpoint" {
  description = "RDS Endpoint (without port)"
  value       = split(":", aws_db_instance.postgresql.endpoint)[0]
}

output "db_full_endpoint" {
  description = "RDS Full Endpoint (with port)"
  value       = aws_db_instance.postgresql.endpoint
}

output "db_arn" {
  description = "RDS ARN"
  value       = aws_db_instance.postgresql.arn
}
