# IAM role attached to the EC2 instance. Lets the backend read its
# secrets from SSM and put/get/delete objects on the uploads bucket.
# No long-lived access keys live on the box.

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backend_ec2" {
  name               = "${local.name_prefix}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

data "aws_iam_policy_document" "backend_inline" {
  statement {
    sid     = "S3UploadsRW"
    actions = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = [
      "${aws_s3_bucket.uploads.arn}/*"
    ]
  }

  statement {
    sid       = "S3UploadsList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.uploads.arn]
  }

  statement {
    sid     = "SSMReadParams"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name_prefix}",
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name_prefix}/*"
    ]
  }

  statement {
    sid     = "CWLogsWrite"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "backend_inline" {
  name   = "${local.name_prefix}-backend-policy"
  role   = aws_iam_role.backend_ec2.id
  policy = data.aws_iam_policy_document.backend_inline.json
}

# Lets us reach the instance via SSM Session Manager (no SSH ports needed)
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.backend_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "backend" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.backend_ec2.name
}
