output "s3_bucket" {
  description = "S3 bucket for image uploads. Use as S3_BUCKET env value."
  value       = aws_s3_bucket.uploads.bucket
}

output "ec2_public_ip" {
  description = "Elastic IP attached to the backend instance."
  value       = aws_eip.backend.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the backend instance (Elastic IP form)."
  value       = aws_eip.backend.public_dns
}

output "api_base_url" {
  description = "Base URL for the Android client. Drop into BASE_URL build config."
  value       = "http://${aws_eip.backend.public_ip}:3000/"
}

output "ssh_command" {
  description = "Quick SSH command. Replace path to your private key as needed."
  value       = "ssh -i ~/.ssh/id_ed25519 ec2-user@${aws_eip.backend.public_ip}"
}
