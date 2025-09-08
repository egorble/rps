#!/bin/bash

# Script to install Nginx, obtain SSL certificate, and configure reverse proxy
# For domain: rps-linera.xyz
# Email: egor4042007@gmail.com

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update package list
print_status "Updating package list..."
apt update

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    print_status "Nginx not found. Installing Nginx..."
    apt install -y nginx
    print_status "Nginx installed successfully"
else
    print_status "Nginx is already installed"
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    print_status "Certbot not found. Installing Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_status "Certbot installed successfully"
else
    print_status "Certbot is already installed"
fi

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_status "Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
    print_status "Nginx started and enabled"
fi

# Create Nginx configuration for the domain
print_status "Creating Nginx configuration for rps-linera.xyz..."

cat > /etc/nginx/sites-available/rps-linera.xyz << 'EOF'
server {
    listen 80;
    server_name rps-linera.xyz;

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
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/rps-linera.xyz /etc/nginx/sites-enabled/

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

# Reload Nginx to apply changes
print_status "Reloading Nginx..."
systemctl reload nginx

# Obtain SSL certificate
print_status "Obtaining SSL certificate for rps-linera.xyz..."
certbot --nginx -d rps-linera.xyz --non-interactive --agree-tos --email egor4042007@gmail.com

# Test Nginx configuration again after Certbot changes
print_status "Testing Nginx configuration after SSL setup..."
nginx -t

# Reload Nginx to apply SSL changes
print_status "Reloading Nginx with SSL configuration..."
systemctl reload nginx

print_status "Setup completed successfully!"
print_status "Your site should now be accessible at https://rps-linera.xyz"
print_status "Note: This script only sets up the reverse proxy. You still need to run your frontend/backend applications separately."