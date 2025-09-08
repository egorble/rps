# Nginx SSL Setup for rps-linera.xyz

This document provides instructions for setting up Nginx with a free SSL certificate for the domain rps-linera.xyz.

## Prerequisites

1. A server with Ubuntu/Debian Linux
2. Domain name (rps-linera.xyz) pointing to your server's IP address
3. Ports 80 and 443 open in your firewall
4. Root or sudo access

## Files Included

1. `setup-nginx-ssl.sh` - Automated setup script for Linux
2. `setup-nginx-ssl.bat` - Information script for Windows users
3. `rps-linera.xyz.nginx.conf` - Nginx configuration template

## Automated Setup (Linux/Ubuntu)

1. Make the script executable:
   ```bash
   chmod +x setup-nginx-ssl.sh
   ```

2. Run the script with sudo:
   ```bash
   sudo ./setup-nginx-ssl.sh
   ```

The script will:
- Install Nginx if not already installed
- Install Certbot for SSL certificate management
- Configure Nginx for rps-linera.xyz
- Obtain a free SSL certificate from Let's Encrypt
- Set up reverse proxy from HTTPS (443) to frontend (3000)

## Manual Setup

If you prefer to set up manually or the automated script doesn't work:

### 1. Install Nginx and Certbot
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. Configure Firewall (if using UFW)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
```

### 3. Create Nginx Configuration
Copy the template configuration:
```bash
sudo cp rps-linera.xyz.nginx.conf /etc/nginx/sites-available/rps-linera.xyz
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/rps-linera.xyz /etc/nginx/sites-enabled/
```

Test the configuration:
```bash
sudo nginx -t
```

### 4. Obtain SSL Certificate
```bash
sudo certbot --nginx -d rps-linera.xyz --email egor4042007@gmail.com
```

### 5. Reload Nginx
```bash
sudo systemctl reload nginx
```

## Verification

After setup, you should be able to access your site at:
- https://rps-linera.xyz

The SSL certificate will automatically renew every 90 days thanks to Certbot's built-in renewal mechanism.

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Check Certbot Renewal
```bash
sudo certbot renew --dry-run
```

### View Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### View Nginx Access Logs
```bash
sudo tail -f /var/log/nginx/access.log
```

## Notes

- This setup only configures the reverse proxy. You still need to run your frontend (port 3000) and backend (port 3003) applications separately.
- The SSL certificate will automatically renew, but you can manually test renewal with `sudo certbot renew --dry-run`.
- Make sure your domain's DNS A record points to your server's IP address before running the script.