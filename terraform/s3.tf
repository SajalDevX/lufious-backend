# Random suffix to keep bucket name globally unique without manual choice.
resource "random_id" "bucket_suffix" {
  byte_length = 3
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    # Disabled to stay within S3 free-tier storage budget.
    status = "Disabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lifecycle rule: delete incomplete multipart uploads after 7 days
# (cheap insurance against accidental cost from abandoned uploads).
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
