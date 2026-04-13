# Deployment (Linux VPS)

This guide targets **Ubuntu 24.04 LTS** (or similar) with **root or sudo**, **Node 20+**, **PM2**, and optional **Nginx + Let’s Encrypt**.

Paths below use `/opt/arnold` as the install root — adjust if you prefer `/srv` or a dedicated user home.

---

## 1. Server packages

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt update
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

Verify:

```bash
node -v   # v20.x
pm2 -v
```

---

## 2. Deploy code

**Option A — git (recommended after repo is public):**

```bash
sudo mkdir -p /opt/arnold
sudo chown "$USER":"$USER" /opt/arnold
cd /opt/arnold
git clone https://github.com/shinendev/arnold.git .
```

**Option B — rsync from your laptop:**

```bash
rsync -avz --exclude node_modules --exclude '.git' \
  ./subcon/  user@your.vps:/opt/arnold/
```

---

## 3. Build

```bash
cd /opt/arnold/arnold
npm ci
npm run build

cd /opt/arnold/arnold-agent
npm ci
npm run build
```

---

## 4. Environment files

Create **two** `.env` files (never commit them):

```bash
nano /opt/arnold/arnold/.env
nano /opt/arnold/arnold-agent/.env
```

Minimum:

| File | Must contain |
|------|----------------|
| `arnold/.env` | `CLAUDE_API_KEY` |
| `arnold-agent/.env` | `CLAUDE_API_KEY` + all `TWITTER_*` keys |

See [CONFIGURATION.md](CONFIGURATION.md) for the full variable list.

---

## 5. PM2

The repo includes `ecosystem.config.js` with **absolute** paths for `/opt/arnold`. From the server:

```bash
cd /opt/arnold
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

Follow the printed `sudo env PATH=...` helper once so PM2 resurrects after reboot.

Useful commands:

```bash
pm2 status
pm2 logs arnold-api --lines 50
pm2 logs arnold-agent --lines 50
pm2 restart arnold-api arnold-agent
```

---

## 6. Nginx reverse proxy (API)

Example site `/etc/nginx/sites-available/arnold`:

```nginx
server {
    listen 80;
    server_name your.domain.com;

    location / {
        proxy_pass http://127.0.0.1:3210;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/arnold /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

TLS:

```bash
sudo certbot --nginx -d your.domain.com
```

---

## 7. Updates

```bash
cd /opt/arnold
git pull
cd arnold && npm ci && npm run build
cd ../arnold-agent && npm ci && npm run build
pm2 restart all
```

SQLite databases live beside the apps (`*.db`, `./data/users/*.db`) — back them up before risky migrations.

---

## 8. Hardening checklist

- [ ] Do not expose `:3210` publicly without auth or firewall rules.
- [ ] Use TLS on Nginx.
- [ ] Rotate API keys if leaked.
- [ ] Create a non-root deploy user + file permissions if moving beyond MVP.

See [SECURITY.md](SECURITY.md).
