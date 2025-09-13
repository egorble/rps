Follow the below steps to run the Application on Your Local Machine:

For Client:
1) Begin by installing the required dependencies using the command: npm install.
2) Create a .env file at the root path and include the following keys:
	REACT_APP_SOCKET_URL = https://rps-linera.xyz/
	REACT_APP_BASE_URL = https://rps-linera.xyz/
3) Launch the application on port 3000 using the command: npm start.

For Server:
1) Start by installing the necessary dependencies using: npm install.
2) Initiate the application on port 8080 by executing: npm start.

For Production Deployment:
1) Use the deploy-nginx-ssl.sh script to set up Nginx and SSL certificates
2) Ensure the frontend is running on port 3000
3) The Nginx configuration will handle HTTPS, GraphQL proxying, and WebSocket connections