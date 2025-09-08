@echo off
REM Script to install Nginx, obtain SSL certificate, and configure reverse proxy
REM For domain: rps-linera.xyz
REM Email: egor4042007@gmail.com

echo [INFO] This script is designed for Linux environments with apt package manager.
echo [INFO] For Windows, please manually install Nginx and Certbot, or use WSL.
echo [INFO] Follow these steps:
echo.
echo 1. Install Nginx:
echo    - Download from http://nginx.org/en/download.html
echo    - Extract and configure as a service
echo.
echo 2. Install Certbot:
echo    - Download from https://certbot.eff.org/
echo    - Or use Chocolatey: choco install certbot
echo.
echo 3. Configure Nginx:
echo    - Create config file in nginx/conf/sites-available/rps-linera.xyz
echo    - Add reverse proxy configuration for port 3000
echo.
echo 4. Obtain SSL certificate:
echo    - Run: certbot --nginx -d rps-linera.xyz --email egor4042007@gmail.com
echo.
echo [INFO] Note: This script only sets up the reverse proxy. You still need to run your frontend/backend applications separately.