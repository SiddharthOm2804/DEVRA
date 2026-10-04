# DevPilot Production Deployment Guide

## 1. Prerequisites
- **Node.js**: v20.x LTS or higher
- **npm**: v10.x or higher
- **MongoDB**: v6.0 or v7.0 (Replica Set recommended for transactions)
- **Docker & Docker Compose**: (Optional for containerized deployments)
- **AI API Key**: Google Gemini API Key (`AI_API_KEY`) or OpenAI Key

---

## 2. Environment Configuration

Copy the example environment template:
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Essential Production Variables (`server/.env`):
| Variable | Description | Example / Recommended |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend listening port | `5000` |
| `CLIENT_URL` | Public web app URL | `https://devpilot.yourdomain.com` |
| `MONGODB_URI` | MongoDB Connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/devpilot` |
| `JWT_SECRET` | 32+ char cryptographic secret | `openssl rand -base64 32` |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `AI_PROVIDER` | LLM Provider | `gemini` or `openai` |
| `AI_API_KEY` | API Key | `AIzaSy...` |
| `AI_MODEL` | Foundation Model | `gemini-1.5-pro` or `gpt-4o` |

---

## 3. Containerized Deployment (Docker Compose)

The monorepo provides a production-grade multi-container `docker-compose.yml`:

```bash
# 1. Build and start containers in detached mode
docker compose up -d --build

# 2. Check container health status
docker compose ps

# 3. View real-time logs
docker compose logs -f server
```

The stack exposes:
- **Client (Nginx)**: Port `80` (or reverse-proxied behind Traefik / Cloudflare)
- **API Server**: Port `5000`
- **MongoDB**: Port `27017` (isolated in private network `devpilot-network`)

---

## 4. Bare Metal / VM Deployment (PM2 + Nginx)

### Step 1: Install dependencies and compile
```bash
# Root monorepo install
npm install

# Build client production bundle
npm --prefix client run build

# Compile VS Code extension
npm --prefix extension run compile
```

### Step 2: Start Backend with PM2 Cluster Mode
```bash
# Start cluster using ecosystem configuration
pm2 start ecosystem.config.cjs

# Verify cluster status
pm2 status
pm2 logs devpilot-api

# Save PM2 process list to run on system restart
pm2 save
pm2 startup
```

### Step 3: Configure Host Nginx Reverse Proxy
Place the following in `/etc/nginx/sites-available/devpilot.conf`:

```nginx
server {
    listen 80;
    server_name devpilot.yourdomain.com;

    # Static Client Assets
    location / {
        root /var/www/devpilot/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
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

Enable site and generate SSL with Let's Encrypt Certbot:
```bash
ln -s /etc/nginx/sites-available/devpilot.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d devpilot.yourdomain.com
```

---

## 5. Production Health & Verification

1. **Heartbeat API**:
   ```bash
   curl -s http://localhost:5000/api/health | jq
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "message": "Devra Server is running smoothly",
     "database": { "status": "connected", "readyState": 1 }
   }
   ```

2. **Security Headers Verification**:
   Verify Helmet headers:
   ```bash
   curl -I http://localhost:5000/api/health
   ```
   Headers present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`.

3. **Rate Limiting Verification**:
   Exceeding 20 authentication attempts on `/api/auth/login` returns HTTP `429 Too Many Requests`.
