# 🚀 Deployment Scripts

Quick deployment scripts for AWS EC2.

## 📋 Prerequisites

1. **EC2 Instance** running Ubuntu 22.04
2. **SSH Key** (`intent-platform-key.pem`) in current directory
3. **EC2 IP Address**

## 🔧 Setup

### 1. Make Scripts Executable

```bash
chmod +x deploy/*.sh
```

### 2. Update EC2 IP

Replace `YOUR_EC2_IP` in scripts or pass as argument:

```bash
./deploy/upload-backend.sh 44.202.189.78
```

## 📤 Deployment Steps

### Step 1: Setup EC2 Instance

**On EC2 (SSH into instance):**

```bash
# Copy ec2-setup.sh to EC2
scp -i intent-platform-key.pem deploy/ec2-setup.sh ubuntu@YOUR_EC2_IP:/home/ubuntu/

# SSH into EC2
ssh -i intent-platform-key.pem ubuntu@YOUR_EC2_IP

# Run setup script
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### Step 2: Upload Backend

**From local machine:**

```bash
cd "/Users/bhanukiran/Downloads/ACENTLE/UiP/URIP/Updated Code/RealEstate Intent AI Platform/intent-frontend-full-working"

./deploy/upload-backend.sh YOUR_EC2_IP
```

**On EC2:**

```bash
cd /home/ubuntu/app/backend
tar -xzf /home/ubuntu/backend.tar.gz
rm /home/ubuntu/backend.tar.gz
npm install
npm run build --workspace=@uip/core
npm run build --workspaces --if-present
```

### Step 3: Upload Frontend

**From local machine:**

```bash
./deploy/upload-frontend.sh YOUR_EC2_IP
```

**On EC2:**

```bash
mkdir -p /home/ubuntu/app/frontend
cd /home/ubuntu/app/frontend
tar -xzf /home/ubuntu/frontend.tar.gz
rm /home/ubuntu/frontend.tar.gz
```

### Step 4: Upload Services

**From local machine:**

```bash
./deploy/upload-services.sh YOUR_EC2_IP
```

**On EC2:**

```bash
cd /home/ubuntu/app/email-service
npm install --production
# Create .env file with your SendGrid API key

cd /home/ubuntu/app/video-service
npm install --production
# Create .env file with your LiveKit credentials
```

### Step 5: Configure PM2

**On EC2, create `/home/ubuntu/app/backend/ecosystem.config.js`:**

See `AWS_DEPLOYMENT_GUIDE.md` for full PM2 configuration.

```bash
cd /home/ubuntu/app/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

### Step 6: Configure Nginx

**On EC2, create `/etc/nginx/sites-available/intent-platform`:**

See `AWS_DEPLOYMENT_GUIDE.md` for full Nginx configuration.

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/intent-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## ✅ Verify

```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Test endpoints
curl http://YOUR_EC2_IP/
curl http://YOUR_EC2_IP/api/intent/v1/health
```

## 📝 Notes

- Replace `YOUR_EC2_IP` with your actual EC2 IP address
- Update `.env` files on EC2 with production credentials
- Configure security groups to allow ports 22, 80, 443
- Keep backend engine ports (7001-7008) on localhost only

## 🔗 Full Guide

See `../AWS_DEPLOYMENT_GUIDE.md` for complete deployment instructions.
