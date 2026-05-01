variable "region" {
  description = "AWS region. ap-south-1 is in free-tier scope."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Project name used as resource name prefix."
  type        = string
  default     = "lufious"
}

variable "env" {
  description = "Environment label (dev/prod)."
  type        = string
  default     = "dev"
}

# --- EC2 ---
variable "instance_type" {
  description = "EC2 instance type. Keep at t3.micro for free tier."
  type        = string
  default     = "t3.micro"

  validation {
    condition     = contains(["t2.micro", "t3.micro"], var.instance_type)
    error_message = "Use t2.micro or t3.micro to stay within the AWS Free Tier."
  }
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH into EC2. Restrict to your IP for safety."
  type        = string
  default     = "0.0.0.0/0"
}

variable "ssh_public_key" {
  description = "Contents of your ~/.ssh/id_ed25519.pub (or id_rsa.pub). Required for SSH access."
  type        = string
  sensitive   = true
}

variable "github_repo_url" {
  description = "Git URL the EC2 will clone the backend from."
  type        = string
  default     = "https://github.com/SajalDevX/lufious-backend.git"
}

variable "github_branch" {
  description = "Branch the EC2 deploys from."
  type        = string
  default     = "main"
}

# --- Secrets pushed into SSM Parameter Store ---
# All marked sensitive so plan output redacts them.
variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "mongodb_db" {
  type    = string
  default = "lufious"
}

variable "firebase_service_account_b64" {
  description = "Base64 of Firebase service account JSON."
  type        = string
  sensitive   = true
}

variable "openweather_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "plantnet_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "openrouter_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "openrouter_model" {
  type    = string
  default = "google/gemini-1.5-flash"
}

variable "cron_secret" {
  description = "Random string guarding /api/cron/* endpoints. openssl rand -hex 32."
  type        = string
  sensitive   = true
}

variable "upstash_redis_rest_url" {
  type      = string
  default   = ""
  sensitive = true
}

variable "upstash_redis_rest_token" {
  type      = string
  default   = ""
  sensitive = true
}
