# Hosting Multiple Next.js Apps on Hostinger KVM VPS — Complete Production Guide (2026)

**Target Server:** Hostinger KVM 2 (2 vCPU, 8GB RAM, Ubuntu)
**Audience:** Developer comfortable with code, not a full sysadmin

---

## Executive Summary

- **OS:** Ubuntu 24.04 LTS — the right choice for a 5-year support window through 2029
- **Reverse Proxy:** Caddy over Nginx for this use case — automatic SSL, dramatically simpler config, zero-touch certificate renewal
- **Process Manager:** PM2 with `ecosystem.config.js` — industry standard for Node.js/Next.js on bare metal
- **Node.js:** nvm per-user install — handles multiple versions cleanly across apps
- **CI/CD:** GitHub Actions + SSH + PM2 reload — lightweight, no extra infrastructure required
- **Email:** Do NOT self-host email. Use Resend, Postmark, or Brevo (formerly Sendinblue). Hostinger rate-limits port 25 to 5 msgs/minute and IP reputation management is a full-time job.
- **Capacity:** A KVM 2 (2 vCPU, 8GB RAM) can comfortably run 4–6 lightweight-to-medium Next.js apps simultaneously in bare-metal mode, or 3–4 if using Docker per-app.
- **Self-hosted PaaS (Optional):** Coolify is the strongest option if you want a Vercel-like dashboard experience instead of managing PM2/Caddy manually.

---

## 1. OS & Initial Server Setup

### Which Ubuntu Version

**Use Ubuntu 24.04 LTS (Noble Numbat).** Released April 2024, supported until April 2029. It ships with a modern kernel (6.8+), glibc 2.39, and OpenSSL 3.0. Ubuntu 22.04 LTS is still acceptable but 24.04 is the correct choice for new deployments in 2026.

Do NOT use 23.x or 25.x (non-LTS) on production servers.

### First Steps After Provisioning

```bash
# 1. Update everything
apt update && apt upgrade -y

# 2. Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy

# 3. Copy your SSH key to the new user
# (run this from your LOCAL machine, not the server)
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@YOUR_SERVER_IP

# 4. Switch to deploy user for remaining setup
su - deploy
```

### SSH Hardening

Edit `/etc/ssh/sshd_config`:

```
Port 2222                    # Change default port (optional but reduces noise)
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
MaxSessions 2
X11Forwarding no
AllowTcpForwarding no
```

```bash
systemctl restart sshd
```

**CRITICAL:** Test your SSH key login in a NEW terminal BEFORE closing your current session, or you will lock yourself out.

### UFW Firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp        # SSH (use your custom port)
ufw allow 80/tcp          # HTTP
ufw allow 443/tcp         # HTTPS
ufw enable
ufw status verbose
```

### Fail2ban

```bash
apt install fail2ban -y

# Create local override (never edit jail.conf directly)
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Edit `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime  = 3600      # 1 hour ban
findtime = 600       # 10 minute window
maxretry = 3         # 3 strikes

[sshd]
enabled  = true
port     = 2222      # match your SSH port
```

```bash
systemctl enable fail2ban
systemctl start fail2ban
```

### Automatic Security Updates

```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
# Accept "yes" when prompted
```

### Swap Space (Critical for Next.js Builds)

Next.js builds are memory-intensive. Even with 8GB RAM, adding swap prevents OOM kills during builds:

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 2. Node.js Runtime — nvm vs NodeSource

### Verdict: Use nvm

**nvm (Node Version Manager)** is the correct choice when:
- You are running multiple Next.js apps that may target different Node versions
- You need to upgrade Node versions per-app without affecting others
- You want to avoid permission issues with global npm installs

**NodeSource** is correct only when you need a single system-wide Node version and are using config management tools like Ansible or cloud-init scripts at scale.

### nvm Installation

```bash
# Install nvm (run as deploy user, not root)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload shell
source ~/.bashrc

# Install LTS Node (22.x as of 2026)
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'

# Verify
node --version
npm --version
```

### Important: PM2 + nvm Compatibility

When using PM2 with nvm, PM2 must be started within the nvm environment. Add this to `/home/deploy/.bashrc` to ensure nvm is loaded in non-interactive shells (needed for GitHub Actions SSH sessions):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Install PM2 globally after setting up nvm:

```bash
npm install -g pm2
```

---

## 3. PM2 — Process Manager for Multiple Next.js Apps

PM2 is the production standard for running Node.js applications on bare metal. It provides crash recovery, log management, cluster mode, and startup scripts.

### Project Structure

Organize your apps consistently:

```
/home/deploy/
  apps/
    app1/          # First Next.js app (domain1.com)
    app2/          # Second Next.js app (domain2.com)
    app3/          # Third Next.js app (domain3.com)
```

### ecosystem.config.js

Create this file at `/home/deploy/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'app1',
      cwd: '/home/deploy/apps/app1',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/home/deploy/logs/app1-error.log',
      out_file: '/home/deploy/logs/app1-out.log',
    },
    {
      name: 'app2',
      cwd: '/home/deploy/apps/app2',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '1G',
      error_file: '/home/deploy/logs/app2-error.log',
      out_file: '/home/deploy/logs/app2-out.log',
    },
    {
      name: 'app3',
      cwd: '/home/deploy/apps/app3',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      max_memory_restart: '1G',
      error_file: '/home/deploy/logs/app3-error.log',
      out_file: '/home/deploy/logs/app3-out.log',
    },
  ],
};
```

### Starting & Managing Apps

```bash
mkdir -p /home/deploy/logs

# Start all apps
pm2 start /home/deploy/ecosystem.config.js

# Save process list so PM2 restores on reboot
pm2 save

# Generate and enable systemd startup script
pm2 startup systemd -u deploy --hp /home/deploy
# Run the output command it gives you as root/sudo

# Useful daily commands
pm2 list                    # Status of all apps
pm2 logs app1               # Tail logs for app1
pm2 restart app1            # Restart specific app
pm2 reload app1             # Zero-downtime reload
pm2 monit                   # Real-time dashboard
```

### Log Rotation

```bash
pm2 install pm2-logrotate

pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14        # Keep 14 days
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

---

## 4. Reverse Proxy — Caddy vs Nginx

### Verdict: Caddy for Beginners, Nginx for Advanced Control

| Feature | Caddy | Nginx |
|---|---|---|
| SSL/TLS | Automatic (zero config) | Manual Certbot setup |
| Config complexity | 10–20 lines per site | 25–40 lines per site |
| HTTP/3 support | Yes (built-in) | Requires NGINX Plus or patch |
| Config reload | `caddy reload` (zero-downtime) | `nginx -s reload` |
| Documentation | Excellent | Extensive but complex |
| Resource usage | Slightly higher | Slightly lower |
| Ecosystem maturity | Newer (2015+) | Very mature (2004+) |
| Best for | Developers, small teams | Large infra, advanced configs |

**For your use case (multiple Next.js apps on a single VPS as a solo developer), use Caddy.** It eliminates the entire SSL certificate management problem and the config is dramatically simpler.

### Installing Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y
```

### Caddyfile Configuration

Edit `/etc/caddy/Caddyfile`:

```caddyfile
# Global options
{
    email admin@yourdomain.com    # For Let's Encrypt notifications
}

# App 1 — domain1.com → port 3000
domain1.com, www.domain1.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Compress responses
    encode gzip

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}

# App 2 — domain2.com → port 3001
domain2.com, www.domain2.com {
    reverse_proxy localhost:3001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip
}

# App 3 — domain3.com → port 3002
domain3.com, www.domain3.com {
    reverse_proxy localhost:3002 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    encode gzip
}
```

```bash
# Validate config
caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy with zero downtime
caddy reload --config /etc/caddy/Caddyfile

# Or restart the systemd service
systemctl restart caddy
systemctl enable caddy
```

### Nginx Alternative (If You Prefer)

If you choose Nginx, here's the equivalent multi-domain config pattern. You need one file per domain in `/etc/nginx/sites-available/`:

**`/etc/nginx/sites-available/domain1.com`:**

```nginx
server {
    listen 80;
    server_name domain1.com www.domain1.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domain1.com www.domain1.com;

    ssl_certificate /etc/letsencrypt/live/domain1.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain1.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable each site
ln -s /etc/nginx/sites-available/domain1.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Repeat for each domain. Then run Certbot for SSL (see Section 5).

---

## 5. SSL/TLS — Caddy Auto SSL vs Let's Encrypt + Certbot

### Caddy Automatic SSL (Recommended)

Caddy handles everything automatically when you use real domain names in your Caddyfile:

- Obtains certificates from Let's Encrypt on first request
- Falls back to ZeroSSL if Let's Encrypt is unavailable
- Renews certificates automatically (no cron job needed)
- Supports OCSP stapling by default
- Zero configuration required beyond the domain name in your Caddyfile

**Requirement:** Your DNS A records must point to your VPS IP BEFORE Caddy starts, otherwise the ACME challenge fails.

### Let's Encrypt + Certbot (for Nginx)

```bash
apt install certbot python3-certbot-nginx -y

# Obtain certificate for a domain
certbot --nginx -d domain1.com -d www.domain1.com

# Certbot auto-installs a systemd timer for renewal
# Verify renewal works
certbot renew --dry-run
```

Certbot installs a systemd timer that runs twice daily and auto-renews certificates expiring within 30 days.

### Comparison

| | Caddy Auto SSL | Nginx + Certbot |
|---|---|---|
| Setup time | Zero — works automatically | 5-10 min per domain |
| Renewal | Fully automatic | Auto via systemd timer |
| Failure risk | Very low (fallback to ZeroSSL) | Timer can silently fail |
| Wildcard certs | Supported (DNS challenge) | Supported (DNS challenge) |
| Complexity | None | Moderate |

**Bottom line:** If you chose Caddy, SSL is already solved. If you chose Nginx, Certbot is robust and well-tested across millions of domains.

---

## 6. CI/CD — GitHub Actions Deployment Pipeline

### Architecture

```
git push to main
    → GitHub Actions runner triggers
    → Build Next.js app
    → SSH into VPS
    → Pull latest code
    → Install dependencies
    → Run next build
    → PM2 reload (zero-downtime)
```

### GitHub Repository Secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

```
VPS_HOST         = your.server.ip.address
VPS_USER         = deploy
VPS_SSH_KEY      = (contents of your private SSH key)
VPS_PORT         = 2222
VPS_APP_PATH     = /home/deploy/apps/app1
PM2_APP_NAME     = app1
```

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js app
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

            cd ${{ secrets.VPS_APP_PATH }}

            # Pull latest code
            git pull origin main

            # Install production dependencies
            npm ci --production=false

            # Build the app
            npm run build

            # Zero-downtime reload via PM2
            pm2 reload ${{ secrets.PM2_APP_NAME }} --update-env

            echo "Deployment complete"
```

### Alternative: Build on CI, rsync to VPS

If your VPS is memory-constrained or builds are slow, build on GitHub's runners and rsync only the build output:

```yaml
      - name: Sync build to VPS
        run: |
          rsync -avz --delete \
            -e "ssh -p ${{ secrets.VPS_PORT }} -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no" \
            .next/ \
            node_modules/ \
            package.json \
            ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }}:${{ secrets.VPS_APP_PATH }}/

      - name: Restart app on VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: pm2 reload ${{ secrets.PM2_APP_NAME }}
```

---

## 7. Email — Self-Host or External Service?

### Verdict: Use an External Transactional Email Service

**Do not self-host email on your application VPS.** Here is why:

1. **Hostinger rate-limits port 25** to 5 messages per minute. This is hardcoded and support will not increase it.
2. **IP reputation** on a new VPS IP is zero. Your emails will land in spam for weeks/months until your IP builds reputation with major providers (Gmail, Outlook, Yahoo).
3. **Mailcow** (the leading self-hosted email suite) requires a minimum of **6GB RAM** just for the mail server stack (Postfix + Dovecot + Rspamd + ClamAV + SOGo). This would consume your entire VPS.
4. **Ongoing maintenance**: SPF, DKIM, DMARC, blacklist monitoring, certificate renewal for mail — this is a part-time job.

### Recommended External Services (2026)

| Service | Free Tier | Best For |
|---|---|---|
| **Resend** | 3,000 emails/month, 100/day | Next.js apps (React Email integration) |
| **Postmark** | 100 emails/month free | Transactional, highest deliverability |
| **Brevo** (Sendinblue) | 300 emails/day free | Marketing + transactional combo |
| **SendGrid** | 100 emails/day free | High volume, established provider |
| **Mailgun** | 1,000 emails/month (3 months trial) | API-first, developer-friendly |

**Resend** is the current favorite in the Next.js ecosystem. It has a native Next.js SDK and integrates with React Email for templating.

### If You Need to Receive Email on Your Domain

Use **Cloudflare Email Routing** (free) or **ImprovMX** (free tier) to forward `contact@yourdomain.com` to your personal Gmail/Outlook account. No email server required.

---

## 8. Monitoring

### Layer 1: PM2 Built-in Monitoring

```bash
# Real-time terminal dashboard
pm2 monit

# Process list with CPU/memory
pm2 list

# Logs
pm2 logs                    # All apps
pm2 logs app1 --lines 100  # Specific app, last 100 lines

# PM2 web dashboard (paid, optional)
pm2 plus
```

### Layer 2: External Uptime Monitoring

Run uptime checks from OUTSIDE your server. If your VPS goes down, you want to know before your users do.

**Free options (2026):**

- **UptimeRobot** — 50 free monitors, 5-minute check intervals. Best free option for basic uptime.
- **Better Stack (Uptime)** — 10 free monitors, 3-minute intervals, includes status pages and incident management.
- **Uptime Kuma** — Self-hosted on YOUR server (irony: if the server dies, so does your monitoring). Only use if you have a second server.

**Recommendation:** UptimeRobot for free monitoring, Better Stack if you want status pages and Slack/PagerDuty alerts.

### Layer 3: Server Resource Monitoring

```bash
# Install htop for interactive monitoring
apt install htop -y

# Install netdata for a browser-based real-time dashboard (optional)
wget -O /tmp/netdata-kickstart.sh https://my-netdata.io/kickstart.sh
sh /tmp/netdata-kickstart.sh
# Access at http://YOUR_IP:19999
```

### Layer 4: Log Aggregation (Optional)

For production apps with traffic, consider shipping logs to a managed service:

- **Better Stack Logs** (formerly Logtail) — generous free tier, excellent Next.js integration
- **Papertrail** — simple syslog-based log shipping, free for 50MB/day

---

## 9. Backups

### Hostinger Built-in Backups

Hostinger KVM VPS includes weekly automatic snapshots by default. You can upgrade to daily snapshots from the VPS dashboard:
- VPS Dashboard → Manage → Backups & Monitoring → Snapshots & Backups
- Options: Daily, Weekly, or Off

**Use Hostinger backups as your last resort**, not your primary backup strategy. They only retain one snapshot at a time (overwritten each cycle).

### Recommended Backup Stack: Restic

**Restic** is the best tool for VPS backups in 2026:
- Client-side encryption (AES-256) before data leaves your server
- Incremental/deduplicating backups (only changed chunks uploaded)
- Point-in-time snapshots with retention policies
- Supports any backend: S3, Backblaze B2, SFTP, local

```bash
apt install restic -y

# Initialize a repository on Backblaze B2 (cheap: ~$0.006/GB/month)
export B2_ACCOUNT_ID=your_account_id
export B2_ACCOUNT_KEY=your_account_key
restic -r b2:your-bucket-name:vps-backups init

# First backup
restic -r b2:your-bucket-name:vps-backups backup \
  /home/deploy/apps \
  /etc/caddy \
  /home/deploy/ecosystem.config.js
```

### Automated Daily Backup Script

Create `/home/deploy/backup.sh`:

```bash
#!/bin/bash
export B2_ACCOUNT_ID=your_account_id
export B2_ACCOUNT_KEY=your_account_key
export RESTIC_PASSWORD=your_strong_restic_password
REPO="b2:your-bucket-name:vps-backups"

restic -r $REPO backup \
  /home/deploy/apps \
  /etc/caddy \
  /home/deploy/ecosystem.config.js \
  --exclude /home/deploy/apps/*/node_modules \
  --exclude /home/deploy/apps/*/.next/cache

# Keep 7 daily, 4 weekly, 3 monthly
restic -r $REPO forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 3 \
  --prune

restic -r $REPO check
```

```bash
chmod +x /home/deploy/backup.sh

# Schedule via cron at 3am daily
crontab -e
# Add: 0 3 * * * /home/deploy/backup.sh >> /home/deploy/logs/backup.log 2>&1
```

### What to Back Up

| Item | Location | Frequency |
|---|---|---|
| App source code | Git remote (GitHub) | On every push |
| App environment files (.env) | Restic → B2 | Daily |
| PM2 ecosystem config | Restic → B2 | Daily |
| Caddy/Nginx config | Restic → B2 | Daily |
| Database | Separate DB backup script | Daily |
| node_modules | Do NOT back up — reinstall from package-lock.json | N/A |

---

## 10. Docker vs Bare Metal

### Verdict: Bare Metal for a Solo Developer on a Single VPS

| Factor | Bare Metal (PM2) | Docker per App |
|---|---|---|
| Setup complexity | Low | Medium–High |
| Resource overhead | Minimal | ~100–200MB per container |
| Port management | Simple (PM2 ecosystem.config.js) | Docker Compose per app |
| Isolation | Process-level | Container-level (better) |
| Deployment speed | Fast (PM2 reload) | Slower (image build + push + pull) |
| Debugging | Easy (direct log access) | Slightly more steps |
| Scaling | Vertical only | Horizontal (multiple containers) |
| Best for | 1 developer, 3–6 apps, fixed infra | Teams, many apps, need isolation |

### When Docker IS Worth It on a VPS

- You have apps with different Node versions that cannot coexist (rare with nvm)
- You need to run non-Node services (PostgreSQL, Redis, workers) alongside Next.js
- You want environment parity between local dev and production
- You are using Coolify (it runs Docker under the hood anyway)

### Docker Resource Cost

Each Docker container running a Next.js app in production uses approximately:
- 50–100MB RAM at idle
- An additional 100–300MB RAM under load
- Negligible CPU overhead (1–3%)
- Plus Docker daemon itself: ~100–200MB RAM

On an 8GB server running 4 Docker containers, you lose about 700MB–1.2GB to Docker overhead versus bare metal.

**Conclusion:** For a solo developer managing 3–6 Next.js apps, bare metal with PM2 is simpler and wastes fewer resources. Docker becomes compelling when you need database containers, Redis, or want Coolify's deployment dashboard.

---

## 11. Self-Hosted PaaS — Coolify vs CapRover vs Dokku

### Overview Comparison

| Feature | Coolify | CapRover | Dokku |
|---|---|---|---|
| UI | Modern web dashboard | Web dashboard | CLI only |
| Setup complexity | Low | Low | Medium |
| Docker Compose support | Full | Limited | Plugin-based |
| Git push deploy | Yes (GitHub App) | Yes (webhook) | Yes (git remote) |
| Automatic SSL | Yes | Yes | Yes (plugin) |
| Built-in databases | Yes | Marketplace | Plugin |
| Monitoring | Basic built-in | Basic built-in | Plugin |
| Resource usage | ~500MB RAM | ~300MB RAM | ~100MB RAM |
| Active development | Very active (2026) | Slower | Maintained |
| Best for | Teams & developers wanting Vercel-like UX | Simple deployments | Heroku-style CLI fans |

### Coolify — The 2026 Leader

Coolify is the strongest choice if you want a managed experience without paying for Vercel/Netlify. It provides:

- Connect a GitHub repo, and it auto-detects Next.js, sets up build + deploy pipeline
- Automatic SSL via Let's Encrypt for every app
- Deploy Docker Compose stacks (useful for apps with databases)
- Built-in environment variable management with encryption
- Health checks and auto-restart
- Preview deployments per branch (like Vercel)
- Runs on your own VPS — no external SaaS dependency

**Coolify resource requirement:** ~500MB RAM for the Coolify control plane itself. On an 8GB server, this leaves ~7.5GB for your apps — still plenty.

### Install Coolify

```bash
# One-line install on Ubuntu 24.04
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
# Access at http://YOUR_IP:8000 (then configure your domain)
```

### Should You Use Coolify or Manual PM2+Caddy?

**Use Coolify if:**
- You want a web UI to deploy and manage apps
- You appreciate preview environments per PR
- You plan to add databases (Postgres, Redis) to the same server
- You want GitHub integration without writing YAML

**Use PM2 + Caddy manually if:**
- You prefer full control and minimal overhead
- You are comfortable with SSH and command-line
- You want the absolute minimum resource footprint
- You enjoy writing deployment YAML (GitHub Actions is fine)

Both approaches are production-ready. Coolify does run Docker under the hood, which adds some overhead. Manual PM2 + Caddy is leaner.

---

## 12. Performance — How Many Apps Can a KVM 2 Handle?

### Memory Budget

| Component | RAM Usage |
|---|---|
| Ubuntu 24.04 OS | ~300MB |
| Caddy reverse proxy | ~30–50MB |
| PM2 process manager | ~50MB |
| Next.js app (idle, small) | ~200–350MB |
| Next.js app (idle, medium) | ~400–700MB |
| Next.js app (under load) | +200–500MB |
| Next.js build (while deploying) | +1–2GB (temporary) |

### Realistic Capacity on KVM 2 (2 vCPU, 8GB RAM)

| Scenario | Estimate |
|---|---|
| Small apps (portfolio, blogs, marketing sites) | 8–10 apps |
| Medium apps (SaaS, Next.js + API routes, moderate traffic) | 4–6 apps |
| Large apps (heavy RSC, high traffic, image optimization) | 2–3 apps |
| One large app + Coolify control plane | 3–4 apps |

**Practical recommendation:** Plan for **4–6 small-to-medium Next.js apps** on a KVM 2 with comfortable headroom. Never fully allocate RAM — leave at least 1.5GB free for OS operations, Next.js builds, and burst traffic.

### CPU Considerations

With 2 vCPUs:
- Caddy and PM2 use negligible CPU at idle
- Each Next.js app uses <1% CPU at idle
- Next.js builds are CPU-intensive: a build on a 2-vCPU VPS takes 1–3 minutes for a medium app and will spike CPU to 100%
- Avoid deploying multiple apps simultaneously — stagger your CI/CD pipelines by 5+ minutes if running concurrent deployments

### Scaling Warning Signs

Watch for these signals that you need to upgrade your VPS:
- Free RAM consistently below 500MB (`free -h`)
- CPU load average above 2.0 for extended periods (`uptime`)
- Next.js builds triggering OOM kills (`dmesg | grep oom`)
- P95 response times degrading during deploys

---

## Complete Setup Checklist

### Initial Server Setup
- [ ] Ubuntu 24.04 LTS installed
- [ ] Non-root deploy user created
- [ ] SSH key authentication configured
- [ ] Root login disabled
- [ ] UFW firewall enabled (ports 22/2222, 80, 443)
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled
- [ ] 4GB swap file created

### Node.js & Process Manager
- [ ] nvm installed as deploy user
- [ ] Node.js LTS installed via nvm
- [ ] PM2 installed globally
- [ ] ecosystem.config.js created with all apps
- [ ] PM2 startup script configured (systemd)
- [ ] PM2 logrotate installed and configured

### Reverse Proxy & SSL
- [ ] Caddy installed from official APT repo
- [ ] Caddyfile configured for all domains
- [ ] DNS A records pointing to VPS IP
- [ ] SSL certificates issued automatically by Caddy
- [ ] Caddy enabled as systemd service

### CI/CD
- [ ] Deploy SSH key pair generated
- [ ] VPS_HOST, VPS_USER, VPS_SSH_KEY secrets added to each GitHub repo
- [ ] `.github/workflows/deploy.yml` created per app
- [ ] Test deployment confirmed working

### Monitoring
- [ ] UptimeRobot or Better Stack account set up
- [ ] Monitors configured for each domain (HTTP 200 check)
- [ ] PM2 logrotate configured
- [ ] Alert notifications to email/Slack configured

### Backups
- [ ] Restic installed
- [ ] Backblaze B2 bucket created
- [ ] Restic repository initialized
- [ ] Backup script created and tested
- [ ] Cron job scheduled (daily 3am)
- [ ] Hostinger dashboard backup frequency set to Daily

### Email (External)
- [ ] Resend/Postmark/Brevo account created
- [ ] API key stored in app .env files
- [ ] DNS records added (SPF, DKIM, DMARC) per provider instructions
- [ ] Test email sent and confirmed delivered

---

## Sources

- [Ubuntu VPS Security Hardening Guide: SSH, Firewall, Fail2Ban — MassiveGRID](https://massivegrid.com/blog/ubuntu-vps-security-hardening-guide/)
- [How to Set Up and Harden a New Ubuntu 24.04 Server — Paul Hoke, Medium](https://medium.com/@paulhoke/how-to-set-up-and-harden-a-new-ubuntu-24-04-server-1929ac72161f)
- [How to Install Node.js on Ubuntu Using NVM — OneUptime Blog](https://oneuptime.com/blog/post/2026-01-15-install-nodejs-nvm-ubuntu/view)
- [nvm GitHub Repository](https://github.com/nvm-sh/nvm)
- [Deploying Next.js with PM2: Multiple Instances on Custom Ports — Essa Mamdani](https://www.essamamdani.com/deploying-nextjs-with-pm2-multiple-instances-on-custom-ports)
- [Managing Next.js and NestJS Applications in Production with PM2 — DEV Community](https://dev.to/mochafreddo/managing-nextjs-and-nestjs-applications-in-production-with-pm2-3j25)
- [PM2 Setup: Complete Node.js Production Deployment Guide — PloyCloud](https://ploy.cloud/blog/pm2-nodejs-production-deployment-guide-2025/)
- [Caddy — The Ultimate Server with Automatic HTTPS](https://caddyserver.com/)
- [Caddy Automatic HTTPS Documentation](https://caddyserver.com/docs/automatic-https)
- [Common Caddyfile Patterns — Caddy Documentation](https://caddyserver.com/docs/caddyfile/patterns)
- [Should Caddy and Traefik Replace Certbot? — EFF](https://www.eff.org/deeplinks/2024/03/should-caddy-and-traefik-replace-certbot)
- [How to Host Multiple Next.js Applications on a Single VM with Nginx — TGTPGTCS](https://www.tgtpgtcs.com/2025/04/how-to-host-multiple-nextjs.html)
- [Deploy a Full Stack Application With GitHub Actions to a VPS from Hostinger — DevOps.dev](https://blog.devops.dev/deploy-a-full-stack-application-with-github-actions-to-a-vps-from-hostinger-part-1-fd08bc9d9325)
- [Deploying Next.js to a VPS with minimal CI/CD Pipeline using Docker, GitHub Actions and Caddy — Emil Azazi](https://emirazazi.de/blog/nextjs-vps-deployment/)
- [CI/CD Deployment on Ubuntu VPS Using GitHub Actions — Medium](https://melodyxpot.medium.com/ci-cd-deployment-on-ubuntu-vps-using-github-actions-75aa40af054f)
- [Is SMTP Port 25 Blocked on Hostinger VPS? — Hostinger Help Center](https://support.hostinger.com/en/articles/7854530-is-smtp-port-25-blocked-on-vps)
- [How to Self Host an Email Server in 2026 — YouStable](https://www.youstable.com/blog/how-to-self-host-an-email-server)
- [Better Stack vs UptimeRobot: Which Monitoring Tool is Better in 2026? — API Status Check Blog](https://apistatuscheck.com/blog/better-stack-vs-uptimerobot)
- [11 Best Uptime Monitoring Tools in 2026 — UptimeRobot](https://uptimerobot.com/knowledge-hub/monitoring/11-best-uptime-monitoring-tools-compared/)
- [Automated backup strategies for VPS: rsync, restic, and off-site storage — ServerSpan](https://www.serverspan.com/en/blog/automated-backup-strategies-for-vps-rsync-restic-and-off-site-storage)
- [Restic vs Rclone vs Rsync: Choosing the Right Tool for Backups — DEV Community](https://dev.to/lovestaco/restic-vs-rclone-vs-rsync-choosing-the-right-tool-for-backups-gn9)
- [How to Back Up or Restore a VPS at Hostinger — Hostinger Help Center](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/)
- [Coolify vs Dokku vs CapRover: Best Self-Hosted PaaS? — CyberSnowden](https://cybersnowden.com/coolify-vs-dokku-vs-caprover-self-hosted-platform/)
- [Dokploy vs Coolify vs CapRover in 2026 — MassiveGRID](https://massivegrid.com/blog/dokploy-vs-coolify-vs-caprover/)
- [Self-Hosting Next.js with Coolify: Escaping the $95K Vercel Bill — Medium](https://medium.com/better-dev-nextjs-react/self-hosting-next-js-with-coolify-escaping-the-95k-vercel-bill-d186f593a540)
- [NextJS — Coolify Documentation](https://coolify.io/docs/applications/nextjs)
- [How to Deploy a Next.js App with Coolify on a VPS — MassiveGRID](https://massivegrid.com/blog/deploy-nextjs-with-coolify/)
- [Next.js Hardware Requirements Discussion — Vercel/next.js GitHub](https://github.com/vercel/next.js/discussions/65908)
- [Fix Next.js Build Failures on Small Servers with Swap — Better Stack Community](https://betterstack.com/community/guides/scaling-nodejs/fix-nextjs-build-failures/)
- [The Ultimate Hostinger Next.js VPS Deployment 2026 — Review Guidance](https://www.reviewguidance.com/hostinger-next-js-vps-deployment/)
