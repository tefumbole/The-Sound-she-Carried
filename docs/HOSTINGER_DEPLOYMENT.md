# Hostinger deploy — tssc.cloud

VPS pattern matches Manukeza (port **3001**) and New Vision (port **3002**). TSSC API uses **3005** (3003 is AlphaBridge, 3004 is Beyond Tech).

Point the Hostinger DNS A record for `tssc.cloud` to VPS `187.124.2.238` (disable CDN first). Nameservers are currently `hermes.dns-parking.com`.

## 1. MySQL

Create database `tssc` (VPS localhost or hPanel). Put credentials in `apps/api/.env` on the server only.

## 2. Code

```bash
cd /var/www
git clone git@github.com:tefumbole/The-Sound-she-Carried.git tssc
cd tssc
npm ci
npm run build
```

Copy `.env` from your Mac:

```bash
scp apps/api/.env root@YOUR_VPS:/var/www/tssc/apps/api/.env
```

```bash
cd /var/www/tssc
npm run db:migrate
npm run db:seed
cd apps/api && pm2 start npm --name tssc-api -- run start
```

## 3. nginx

```nginx
server {
    listen 80;
    server_name tssc.cloud www.tssc.cloud;
    root /var/www/tssc/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25m;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3005/uploads/;
    }
}
```

Then: `certbot --nginx -d tssc.cloud -d www.tssc.cloud`

## 4. Env (production)

```
PORT=3005
NODE_ENV=production
CORS_ORIGIN=https://tssc.cloud
APP_URL=https://tssc.cloud
```

Campay webhook: `https://tssc.cloud/api/donations/campay/webhook`  
Stripe webhook: `https://tssc.cloud/api/donations/stripe/webhook` (`checkout.session.completed`)
