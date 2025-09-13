@echo off
REM Nginx and SSL deployment script for rps-linera.xyz (Windows version)
REM This script provides instructions for installing Nginx and setting up SSL on Windows

echo Starting Nginx and SSL deployment for rps-linera.xyz
echo.

echo Note: This script provides guidance for manual setup on Windows.
echo For production deployments, it's recommended to use a Linux server.
echo.

echo 1. Download and install Nginx for Windows:
echo    - Visit: http://nginx.org/en/download.html
echo    - Download the latest mainline version for Windows
echo    - Extract to C:\nginx\
echo.

echo 2. Create the Nginx configuration file at C:\nginx\conf\sites-available\rps-linera.xyz:
echo    (Copy the configuration below to that file)
echo.
echo ==================== START CONFIGURATION ====================
echo # Nginx configuration for rps-linera.xyz
echo # This configuration handles HTTPS, frontend, GraphQL API, and WebSocket proxying
echo.
echo # HTTP server - redirect to HTTPS
echo server {
echo     listen 80;
echo     server_name rps-linera.xyz;
echo.
echo     # Redirect all HTTP requests to HTTPS
echo     return 301 https://$server_name$request_uri;
echo }
echo.
echo # HTTPS server
echo server {
echo     listen 443 ssl http2;
echo     server_name rps-linera.xyz;
echo.
echo     # SSL certificate paths - you'll need to obtain these
echo     # For development, you can generate self-signed certificates
echo     ssl_certificate /path/to/your/certificate.crt;
echo     ssl_certificate_key /path/to/your/private.key;
echo.
echo     # Security headers
echo     add_header X-Frame-Options "SAMEORIGIN" always;
echo     add_header X-XSS-Protection "1; mode=block" always;
echo     add_header X-Content-Type-Options "nosniff" always;
echo     add_header Referrer-Policy "no-referrer-when-downgrade" always;
echo.
echo     # Serve frontend (React app)
echo     location / {
echo         proxy_pass http://localhost:3000;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         proxy_read_timeout 86400;
echo     }
echo.
echo     # Proxy GraphQL requests to Linera service
echo     location /graphql {
echo         proxy_pass http://62.72.35.202:8080;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         proxy_read_timeout 86400;
echo     }
echo.
echo     # Proxy chains requests to Linera service
echo     location /chains/ {
echo         proxy_pass http://62.72.35.202:8080/chains/;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection 'upgrade';
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         proxy_read_timeout 86400;
echo     }
echo.
echo     # Proxy WebSocket connections to Linera service
echo     location /ws {
echo         proxy_pass http://62.72.35.202:8080/ws;
echo         proxy_http_version 1.1;
echo         proxy_set_header Upgrade $http_upgrade;
echo         proxy_set_header Connection "upgrade";
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo         proxy_cache_bypass $http_upgrade;
echo         proxy_read_timeout 86400;
echo     }
echo }
echo ==================== END CONFIGURATION ====================
echo.

echo 3. For SSL certificates on Windows, you have several options:
echo    a) For development: Generate self-signed certificates using OpenSSL
echo    b) For production: Use Let's Encrypt with Certbot for Windows
echo       - Download from: https://dl.eff.org/certbot-beta-installer-win32.exe
echo       - Run the installer and follow the instructions
echo.

echo 4. After setting up Nginx and SSL:
echo    - Make sure your frontend is running on port 3000
echo    - Start Nginx with: start nginx
echo    - Your site should be accessible at https://rps-linera.xyz
echo.

pause