# Deploy All – One Command

Deploys **frontend**, **email-service**, **video-service**, **ecosystem config**, and **nginx** to your EC2 instance.

---

## Prerequisites

1. **EC2** – Ubuntu instance with Node, PM2, Nginx (see [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md)).
2. **Engines** – Backend engines (7001–7007) already running on EC2 under `/home/ubuntu/app/engines/`.
3. **SSH key** – `intent-platform-key.pem` in the project root, or pass its path as the second argument.

---

## Run

From the project root (`intent-frontend-full-working`):

```bash
chmod +x deploy/DEPLOY_ALL.sh
./deploy/DEPLOY_ALL.sh YOUR_EC2_IP
```

With a custom key path:

```bash
./deploy/DEPLOY_ALL.sh YOUR_EC2_IP /path/to/your-key.pem
```

Example:

```bash
./deploy/DEPLOY_ALL.sh 44.202.189.78
```

---

## What It Does

1. Ensures `.env.production` exists (creates from defaults if missing).
2. Builds the frontend (`npm run build`).
3. Uploads frontend tarball to EC2 and extracts to `/home/ubuntu/app/frontend`.
4. Uploads `email-service` and `video-service` to `/home/ubuntu/app/` and runs `npm install --production`.
5. Uploads `ecosystem-production.config.js` and `nginx-production.conf`.
6. On EC2: extracts frontend, installs service deps, reloads PM2, reloads Nginx.

---

## After Deploy

- **App:** `http://YOUR_EC2_IP`
- **PM2:** `ssh -i intent-platform-key.pem ubuntu@YOUR_EC2_IP 'pm2 status'`
- **Nginx:** `ssh -i intent-platform-key.pem ubuntu@YOUR_EC2_IP 'sudo systemctl status nginx'`

---

## If Engines Are Not Yet on EC2

Deploy engines first (from your engines repo or package), then run this script. See [AWS_DEPLOYMENT_GUIDE.md](../AWS_DEPLOYMENT_GUIDE.md) for engine layout and PM2 setup.
