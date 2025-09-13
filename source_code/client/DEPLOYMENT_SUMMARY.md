# Deployment Summary for rps-linera.xyz

## Overview
This document summarizes all the changes made to deploy the Rock Paper Scissors application with Nginx and SSL for the domain rps-linera.xyz.

## Changes Made

### 1. Frontend Configuration Updates

#### LineraGameClient.js
- Updated `BASE_URL` from `http://62.72.35.202:8080` to `https://rps-linera.xyz`
- Updated WebSocket URL from `ws://62.72.35.202:8080/ws` to `wss://rps-linera.xyz/ws`

#### Stress Test Script
- Updated endpoint URL in `stress-test.js` to use `https://rps-linera.xyz` with proper path routing

#### Documentation
- Updated `ReadMe.txt` to reflect new URLs and deployment instructions

### 2. Nginx Configuration and Deployment Scripts

#### New Files Created:
1. `deploy-nginx-ssl.sh` - Automated deployment script for Linux
2. `deploy-nginx-ssl.bat` - Guidance script for Windows deployment
3. `rps-linera.xyz.nginx.conf` - Nginx configuration file
4. `NGINX_SSL_DEPLOYMENT.md` - Comprehensive deployment guide

#### Nginx Configuration Features:
- HTTP to HTTPS redirection
- Frontend proxy to localhost:3000
- GraphQL API proxy to `/graphql` endpoint
- Chain requests proxy to `/chains/` endpoint
- WebSocket proxy to `/ws` endpoint
- SSL certificate management with Let's Encrypt
- Security headers for enhanced protection

### 3. Server Configuration Updates

#### Server Index.js
- Updated console output messages to reflect new domain and Nginx proxy setup
- Maintained direct access information for debugging purposes

## URL Structure After Deployment

### Production URLs (via Nginx):
- Frontend: `https://rps-linera.xyz`
- GraphQL API: `https://rps-linera.xyz/graphql`
- Chain requests: `https://rps-linera.xyz/chains/{chainId}/applications/{appId}`
- WebSocket: `wss://rps-linera.xyz/ws`
- Backend API: `https://rps-linera.xyz/api/`

### Direct Access (for debugging):
- Frontend: `http://62.72.35.202:3000`
- Backend: `http://62.72.35.202:3003`
- Linera Service: `http://62.72.35.202:8080`

## Deployment Process

### For Linux Servers:
1. Execute `deploy-nginx-ssl.sh` script
2. Script automatically installs Nginx and Certbot if needed
3. Configures Nginx with proper proxy settings
4. Obtains SSL certificates from Let's Encrypt
5. Ensures all services are properly routed

### For Windows:
1. Follow manual installation instructions in `deploy-nginx-ssl.bat`
2. Install Nginx for Windows manually
3. Configure SSL certificates (self-signed for development)
4. Apply the provided Nginx configuration

## Security Enhancements

1. **SSL/TLS Encryption**: All traffic is encrypted with certificates from Let's Encrypt
2. **HTTP to HTTPS Redirection**: Automatic redirection for all requests
3. **Security Headers**: Added protection against common web vulnerabilities
4. **WebSocket Security**: Proper upgrade headers for secure WebSocket connections

## Testing Verification

After deployment, the following endpoints should be verified:
- ✅ `https://rps-linera.xyz` loads the frontend application
- ✅ `https://rps-linera.xyz/graphql` responds with GraphQL interface
- ✅ `https://rps-linera.xyz/chains/` properly proxies to Linera service
- ✅ `wss://rps-linera.xyz/ws` establishes WebSocket connections
- ✅ `https://rps-linera.xyz/api/` routes to backend services

## Maintenance

### Certificate Renewal:
- Let's Encrypt certificates automatically renew via Certbot
- Manual renewal can be performed with: `sudo certbot renew`

### Configuration Updates:
- Nginx configuration can be updated in `/etc/nginx/sites-available/rps-linera.xyz`
- After changes, test with: `sudo nginx -t`
- Reload with: `sudo systemctl reload nginx`

This deployment ensures a secure, scalable, and maintainable setup for the Rock Paper Scissors application.