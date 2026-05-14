# SSM Parameter Store entries. Standard parameters are always-free.
# Backend reads these at boot via the EC2 instance role.
#
# Each value is provided as a Terraform variable (sensitive) and
# stamped into SSM. Path scheme: /lufious-<env>/KEY

locals {
  ssm_root = "/${local.name_prefix}"
}

resource "aws_ssm_parameter" "mongodb_uri" {
  name  = "${local.ssm_root}/MONGODB_URI"
  type  = "SecureString"
  value = var.mongodb_uri
}

resource "aws_ssm_parameter" "mongodb_db" {
  name  = "${local.ssm_root}/MONGODB_DB"
  type  = "String"
  value = var.mongodb_db
}

resource "aws_ssm_parameter" "firebase_service_account" {
  name  = "${local.ssm_root}/FIREBASE_SERVICE_ACCOUNT"
  type  = "SecureString"
  value = var.firebase_service_account_b64
}

resource "aws_ssm_parameter" "openweather_key" {
  name  = "${local.ssm_root}/OPENWEATHER_KEY"
  type  = "SecureString"
  value = var.openweather_key
}

resource "aws_ssm_parameter" "plantnet_key" {
  name  = "${local.ssm_root}/PLANTNET_KEY"
  type  = "SecureString"
  value = var.plantnet_key
}

resource "aws_ssm_parameter" "openrouter_api_key" {
  name  = "${local.ssm_root}/OPENROUTER_API_KEY"
  type  = "SecureString"
  value = var.openrouter_api_key
}

resource "aws_ssm_parameter" "openrouter_model" {
  name  = "${local.ssm_root}/OPENROUTER_MODEL"
  type  = "String"
  value = var.openrouter_model
}

resource "aws_ssm_parameter" "cron_secret" {
  name  = "${local.ssm_root}/CRON_SECRET"
  type  = "SecureString"
  value = var.cron_secret
}

resource "aws_ssm_parameter" "upstash_redis_rest_url" {
  count = var.upstash_redis_rest_url == "" ? 0 : 1
  name  = "${local.ssm_root}/UPSTASH_REDIS_REST_URL"
  type  = "String"
  value = var.upstash_redis_rest_url
}

resource "aws_ssm_parameter" "upstash_redis_rest_token" {
  count = var.upstash_redis_rest_token == "" ? 0 : 1
  name  = "${local.ssm_root}/UPSTASH_REDIS_REST_TOKEN"
  type  = "SecureString"
  value = var.upstash_redis_rest_token
}

# S3 bucket name is computed by Terraform; expose to EC2 via SSM too.
resource "aws_ssm_parameter" "s3_bucket" {
  name  = "${local.ssm_root}/S3_BUCKET"
  type  = "String"
  value = aws_s3_bucket.uploads.bucket
}

resource "aws_ssm_parameter" "aws_region" {
  name  = "${local.ssm_root}/AWS_REGION"
  type  = "String"
  value = var.region
}

resource "aws_ssm_parameter" "github_token" {
  count = var.github_token == "" ? 0 : 1
  name  = "${local.ssm_root}/GITHUB_TOKEN"
  type  = "SecureString"
  value = var.github_token
}
