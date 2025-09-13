# Nginx and SSL Deployment Guide for rps-linera.xyz

## Overview
This guide explains how to deploy the Rock Paper Scissors application with Nginx and SSL certificates for the domain rps-linera.xyz.

## Changes Made

### 1. Frontend Configuration Updates
- Updated `LineraGameClient.js` to use HTTPS instead of HTTP:
  - Changed `BASE_URL` from `http://62.72.35.202:8080` to `https://rps-linera.xyz`
  - Changed WebSocket URL from `ws://62.72.35.202:8080/ws` to `wss://rps-linera.xyz/ws`

### 2. Nginx Configuration
Created a comprehensive Nginx configuration that:
- Redirects HTTP to HTTPS
- Serves the frontend application
- Proxies GraphQL requests to `/graphql`
- Proxies chain requests to `/chains/`
- Handles WebSocket connections at `/ws`

### 3. SSL Certificate Setup
- Provided automated deployment script for Linux using Certbot
- Included manual setup instructions for Windows

## Deployment Files

### 1. deploy-nginx-ssl.sh (Linux)
Automated deployment script that:
- Installs Nginx if not present
- Installs Certbot for SSL certificate management
- Creates Nginx configuration
- Obtains SSL certificates from Let's Encrypt
- Configures reverse proxy for all services

### 2. deploy-nginx-ssl.bat (Windows)
Guidance script for Windows deployment that:
- Provides instructions for manual Nginx installation
- Includes configuration template
- Offers options for SSL certificate setup

### 3. rps-linera.xyz.nginx.conf
Nginx configuration file with:
- HTTP to HTTPS redirection
- Frontend proxy to localhost:3000
- GraphQL API proxy to /graphql endpoint
- Chain requests proxy to /chains/ endpoint
- WebSocket proxy to /ws endpoint

## How It Works

### URL Structure
After deployment, the application will be accessible at:
- Frontend: `https://rps-linera.xyz`
- GraphQL API: `https://rps-linera.xyz/graphql`
- Chain requests: `https://rps-linera.xyz/chains/{chainId}/applications/{appId}`
- WebSocket: `wss://rps-linera.xyz/ws`

### Proxy Mapping
```
https://rps-linera.xyz/          → http://localhost:3000       (Frontend)
https://rps-linera.xyz/graphql   → http://62.72.35.202:8080    (GraphQL API)
https://rps-linera.xyz/chains/   → http://62.72.35.202:8080/chains/ (Chain requests)
wss://rps-linera.xyz/ws          → http://62.72.35.202:8080/ws (WebSocket)
```

## Deployment Instructions

### For Linux Servers

1. Make the deployment script executable:
   ```bash
   chmod +x deploy-nginx-ssl.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy-nginx-ssl.sh
   ```

3. Ensure your frontend is running on port 3000:
   ```bash
   cd client && npm start
   ```

### For Windows

1. Follow the instructions in `deploy-nginx-ssl.bat`
2. Manually install Nginx for Windows
3. Configure SSL certificates (self-signed for development or Let's Encrypt for production)
4. Start Nginx and ensure your frontend is running on port 3000

## Security Features

### SSL/TLS
- Automatic certificate management with Let's Encrypt
- HTTP to HTTPS redirection
- Strong security headers

### Reverse Proxy Security
- Proper WebSocket upgrade headers
- Connection timeout settings
- Header forwarding for real IP addresses

## Troubleshooting

### Common Issues

1. **Nginx fails to start**:
   - Check configuration syntax: `sudo nginx -t`
   - Check error logs: `sudo tail -f /var/log/nginx/error.log`

2. **SSL certificate issues**:
   - Verify domain DNS records point to the server
   - Check firewall allows ports 80 and 443
   - Renew certificates manually if needed: `sudo certbot renew`

3. **Frontend not loading**:
   - Ensure frontend is running on port 3000
   - Check Nginx access logs: `sudo tail -f /var/log/nginx/access.log`

4. **WebSocket connection failures**:
   - Verify WebSocket proxy configuration
   - Check browser console for connection errors
   - Ensure firewall allows WebSocket connections

## Maintenance

### Certificate Renewal
Let's Encrypt certificates are automatically renewed by Certbot. To manually check:
```bash
sudo certbot renew --dry-run
```

### Nginx Configuration Updates
After modifying the configuration:
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload without downtime
```

## Testing

After deployment, verify that all endpoints work correctly:
1. Visit `https://rps-linera.xyz` - Should show the frontend
2. Check GraphQL endpoint at `https://rps-linera.xyz/graphql` - Should return GraphQL response
3. Test WebSocket connection to `wss://rps-linera.xyz/ws` - Should establish connection
4. Verify chain requests to `https://rps-linera.xyz/chains/` - Should proxy correctly

The deployment ensures secure, efficient access to all application components through a single domain with proper SSL encryption.