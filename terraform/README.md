# lufious-backend Terraform (AWS Free Tier)

Provisions the entire backend on AWS Free Tier:

| Resource | Free-tier note |
|---|---|
| 1× EC2 t3.micro + 8GB gp3 root volume | 750h/mo + 30GB EBS for 12 months |
| 1× Elastic IP attached to that instance | Free while attached to a running instance |
| 1× S3 bucket (private, server-side encryption defaults) | 5GB free for 12 months |
| IAM role + instance profile + scoped policies | Always free |
| SSM Parameter Store (SecureString) for secrets | Standard parameters always free |
| Default VPC + subnet | Free |
| No ALB / NAT / Route 53 | Skipped to stay at $0 |

Cron jobs run via on-instance `crontab` calling `/api/cron/*` — no EventBridge cost.

## One-time setup

1. **Install Terraform** (≥ 1.6).
2. **AWS credentials** — already configured if `aws sts get-caller-identity` works. Otherwise `aws configure` with the IAM user keys you created.
3. **Generate an SSH keypair** if you don't already have one:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/lufious_id -N ""
   ```
4. **Generate a CRON_SECRET**:
   ```bash
   openssl rand -hex 32
   ```
5. **Get the Firebase service-account base64**:
   ```bash
   base64 -w0 ~/Downloads/lufious-firebase-adminsdk-*.json
   ```
6. Copy `terraform.tfvars.example` → `terraform.tfvars`, fill values.

## Apply

```bash
cd terraform
terraform init
terraform plan -out plan.out
terraform apply plan.out
```

Outputs will show `ec2_public_ip`, `s3_bucket`, `api_base_url`. Use these to:

- Set Android `BASE_URL` build-config to `api_base_url` (current `http://<EIP>:3000/`).
- Verify `curl http://<EIP>:3000/api/health` returns `{ ok: true }`.

## SSH in

```bash
ssh -i ~/.ssh/lufious_id ec2-user@<EIP>
sudo journalctl -u lufious-backend.service -f      # live logs
sudo systemctl restart lufious-backend.service     # restart after deploy
sudo cat /etc/lufious/.env | head                   # confirm SSM pulled
```

## Update flow (deploy a new commit)

```bash
ssh ec2-user@<EIP>
sudo -u lufious -H bash -c "cd /opt/lufious/app && git pull && npm ci && npm run build"
sudo systemctl restart lufious-backend.service
```

If a secret value changes, update the corresponding Terraform variable, run
`terraform apply` (rewrites SSM), then SSH and re-run user_data's
`fetch_env` block (or just the SSM fetch + restart).

## Tearing down

```bash
terraform destroy
```

Leaves nothing in AWS, $0 ongoing.

## Costs to watch

The setup is free **only** while:

- Instance type stays `t3.micro` (or `t2.micro`).
- Aggregate hours across all running EC2 stay ≤ 750/mo.
- EBS stays ≤ 30GB.
- S3 stays ≤ 5GB / 20K GET / 2K PUT per month.
- Egress stays ≤ 100GB/mo.
- The Elastic IP is **attached** to a running instance (idle EIP is $3.60/mo).

If you stop the instance for long, **disassociate or release** the EIP.

## What is NOT in this Terraform

- Domain + TLS (no Route 53; backend serves plain HTTP on port 3000).
- ALB / CloudFront (cost money).
- RDS (Mongo Atlas handles DB).
- Lambda (cron uses on-instance crontab instead).
- Remote state backend (state lives in this folder; OK for solo dev). Migrate to an S3 backend when collaborating.

## Production checklist (later)

- Register a domain → Route 53 hosted zone + ACM cert.
- Drop a free CloudFront distribution in front of EC2 for HTTPS + caching.
- Move Terraform state to S3 + DynamoDB lock table.
- Tighten `ssh_cidr` to your IP only.
- Rotate any keys exposed during dev.
