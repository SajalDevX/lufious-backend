#!/usr/bin/env bash
# Bootstraps lufious-backend on an Amazon Linux 2023 EC2 t3.micro.
# - Installs Node 20 + git
# - Pulls SSM secrets into /etc/lufious/.env
# - Clones the repo, installs deps, builds, runs as a systemd service
# - Sets up crontab to hit cron endpoints (uses CRON_SECRET from .env)
#
# Variables interpolated by Terraform via templatefile():
#   ssm_root, region, repo_url, branch
set -euxo pipefail

dnf update -y
dnf install -y git jq awscli

# Node 20 from NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# Application user + dirs
id -u lufious >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin lufious
mkdir -p /etc/lufious /opt/lufious
chown lufious:lufious /etc/lufious /opt/lufious
chmod 750 /etc/lufious

# Pull every SSM parameter under ${ssm_root}/* into /etc/lufious/.env
fetch_env() {
  local out=/etc/lufious/.env
  : >"$out"
  aws ssm get-parameters-by-path \
    --region "${region}" \
    --path "${ssm_root}" \
    --recursive \
    --with-decryption \
    --output json |
    jq -r '.Parameters[] | "\(.Name | sub(".*/"; ""))=\(.Value)"' \
      >>"$out"
  echo "PORT=3000" >>"$out"
  echo "NODE_ENV=production" >>"$out"
  chown lufious:lufious "$out"
  chmod 600 "$out"
}
fetch_env

# Clone + build (use PAT from .env if repo is private)
GH_TOKEN=$(grep '^GITHUB_TOKEN=' /etc/lufious/.env | cut -d= -f2- || true)
CLONE_URL='${repo_url}'
if [ -n "$GH_TOKEN" ] && [[ "$CLONE_URL" == https://github.com/* ]]; then
  CLONE_URL="https://x-access-token:$${GH_TOKEN}@$${CLONE_URL#https://}"
fi
sudo -u lufious -H bash -c "cd /opt/lufious && git clone --depth 1 --branch ${branch} '$CLONE_URL' app"
# scrub token from .env (no longer needed at runtime)
sed -i '/^GITHUB_TOKEN=/d' /etc/lufious/.env
cd /opt/lufious/app
sudo -u lufious -H bash -c "cd /opt/lufious/app && npm ci && npm run build"

# systemd unit
cat >/etc/systemd/system/lufious-backend.service <<'UNIT'
[Unit]
Description=Lufious backend (Hono + Mongo)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=lufious
WorkingDirectory=/opt/lufious/app
EnvironmentFile=/etc/lufious/.env
ExecStart=/usr/bin/node /opt/lufious/app/dist/server.js
Restart=on-failure
RestartSec=5
# tighten fs/network where harmless
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now lufious-backend.service

# Cron: hourly watering reminders, daily scan prune
CRON_SECRET=$(grep '^CRON_SECRET=' /etc/lufious/.env | cut -d= -f2-)
cat >/etc/cron.d/lufious <<CRON
# Hourly: watering reminders
5 * * * * lufious curl -sS -X POST -H "X-Cron-Secret: $${CRON_SECRET}" http://127.0.0.1:3000/api/cron/watering-reminders >/dev/null 2>&1
# Daily 03:30 UTC: prune scans
30 3 * * * lufious curl -sS -X POST -H "X-Cron-Secret: $${CRON_SECRET}" http://127.0.0.1:3000/api/cron/prune-scans >/dev/null 2>&1
CRON
chmod 644 /etc/cron.d/lufious

# Open port 3000 directly via security group; nginx is overkill for v0.
echo "lufious-backend bootstrap complete."
