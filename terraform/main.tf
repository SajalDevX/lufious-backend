provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Env       = var.env
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  name_prefix = "${var.project}-${var.env}"
}
