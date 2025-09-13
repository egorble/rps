#!/bin/bash

# Nginx and SSL deployment script for rps-linera.xyz
# This script installs Nginx, configures it for the application, and sets up SSL with Certbot

# Exit on any error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Nginx and SSL deployment for rps-linera.xyz${NC}"

# Update package list
echo -e "${YELLOW}Updating package list...${NC}"
sudo apt update

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Installing Nginx...${NC}"
    sudo apt install -y nginx
else
    echo -e "${GREEN}Nginx is already installed${NC}"
fi

# Install Certbot and Let's Encrypt plugin if not already installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    sudo apt install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}Certbot is already installed${NC}"
fi

# Create Nginx configuration file
echo -e "${YELLOW}Creating Nginx configuration...${NC}"

sudo tee /etc/nginx/sites-available/rps-linera.xyz > /dev/null << 'EOF'
# Nginx configuration for rps-linera.xyz
# This configuration handles HTTPS, frontend, GraphQL API, and WebSocket proxying

server {
    listen 80;
    server_name rps-linera.xyz;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rps-linera.xyz;

    # SSL certificate paths (will be filled by Certbot)
    ssl_certificate /etc/letsencrypt/live/rps-linera.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rps-linera.xyz/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Serve frontend (React app)
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
        proxy_read_timeout 86400;
    }

    # Proxy GraphQL requests to Linera service
    location /graphql {
        proxy_pass http://62.72.35.202:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Proxy chains requests to Linera service
    location /chains/ {
        proxy_pass http://62.72.35.202:8080/chains/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Proxy WebSocket connections to Linera service
    location /ws {
        proxy_pass http://62.72.35.202:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

echo -e "${GREEN}Nginx configuration created${NC}"

# Enable the site by creating a symlink
echo -e "${YELLOW}Enabling the site...${NC}"
sudo ln -sf /etc/nginx/sites-available/rps-linera.xyz /etc/nginx/sites-enabled/

# Test Nginx configuration
echo -e "${YELLOW}Testing Nginx configuration...${NC}"
sudo nginx -t

# Reload Nginx to apply changes
echo -e "${YELLOW}Reloading Nginx...${NC}"
sudo systemctl reload nginx

# Obtain SSL certificate using Certbot
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
sudo certbot --nginx -d rps-linera.xyz --non-interactive --agree-tos --email egor4042007@gmail.com

# Test Nginx configuration again after Certbot changes
echo -e "${YELLOW}Testing Nginx configuration after SSL setup...${NC}"
sudo nginx -t

# Reload Nginx to apply SSL changes
echo -e "${YELLOW}Reloading Nginx with SSL...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}Nginx and SSL deployment completed successfully!${NC}"
echo -e "${GREEN}Your site should now be accessible at https://rps-linera.xyz${NC}"
echo -e "${YELLOW}Note: Make sure your frontend is running on port 3000${NC}"