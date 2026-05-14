# Default VPC + a public subnet (no NAT, no extra cost).
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Latest Amazon Linux 2023 AMI for the chosen region.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

resource "aws_security_group" "backend" {
  name        = "${local.name_prefix}-backend-sg"
  description = "Lufious backend - SSH from operator, HTTP API to world"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_cidr]
  }

  ingress {
    description = "API HTTP (port 3000 direct - no ALB to avoid cost)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP reserved for future nginx Caddy LetsEncrypt"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS (reserved for future)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All egress"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_key_pair" "operator" {
  key_name   = "${local.name_prefix}-operator"
  public_key = var.ssh_public_key
}

resource "aws_instance" "backend" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.backend.id]
  iam_instance_profile        = aws_iam_instance_profile.backend.name
  key_name                    = aws_key_pair.operator.key_name
  associate_public_ip_address = true

  # Root volume sized to stay within 30GB EBS free tier.
  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    ssm_root = local.ssm_root
    region   = var.region
    repo_url = var.github_repo_url
    branch   = var.github_branch
  })

  tags = {
    Name = "${local.name_prefix}-backend"
  }

  # Re-render user_data when SSM root or branch changes (forces replace).
  lifecycle {
    ignore_changes = [
      ami # never auto-replace just because a newer AMI shipped
    ]
  }
}

# Static public IP; free as long as it remains attached to a running instance.
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"
}
