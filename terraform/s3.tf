# Random suffix to keep bucket name globally unique without manual choice.
resource "random_id" "bucket_suffix" {
  byte_length = 3
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  # ACLs stay blocked (we use bucket policy, not ACLs, for read access).
  block_public_acls       = true
  ignore_public_acls      = true
  # Policy must be allowed so the public-read GET below can attach.
  block_public_policy     = false
  restrict_public_buckets = false
}

# Read-only public access for object URLs — required so PlantNet and
# OpenRouter (vision) can fetch user-uploaded plant photos by URL.
# Uploads still require a presigned PUT, so writes remain locked down.
resource "aws_s3_bucket_policy" "uploads_public_read" {
  bucket     = aws_s3_bucket.uploads.id
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadObjects"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
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
