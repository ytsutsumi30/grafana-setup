output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.main.id
}

output "public_ip" {
  description = "EC2 Public IP"
  value       = aws_eip.main.public_ip
}

output "security_group_id" {
  description = "EC2 Security Group ID"
  value       = aws_security_group.ec2.id
}

output "instance_state" {
  description = "EC2 Instance State"
  value       = aws_instance.main.instance_state
}
