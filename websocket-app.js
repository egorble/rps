class WebSocketGraphQLMonitor {
    constructor() {
        this.queryCount = 0;
        this.isInitialized = false;
        this.isListening = false;
        this.pollingInterval = null;
        this.ws = null;
        this.subscriptionId = 1;
        this.connectionTimeout = null;
        
        // Fixed configuration based on your discovery
        this.WEBSOCKET_URL = 'ws://localhost:8080/ws';
        this.CHAIN_ID = '47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021';
        this.APP_ID = 'dfe2a342d5003570740d71be2541021950060ffe8a5e1ae53e96b58cd2d2ae5d';
        this.HTTP_ENDPOINT = `http://localhost:8080/chains/${this.CHAIN_ID}/applications/${this.APP_ID}`;
        
        this.GRAPHQL_QUERY = `query{
    allRooms{
        roomId,
        player1,
        player2,
        player1Choice,
        player2Choice,
        gameResult{
            player1Wins,
            player2Wins,
            winner
        }
    }
}`;
    }

    log(message, type = 'info') {
        const logs = document.getElementById('logs');
        const timestamp = new Date().toISOString();
        const logEntry = document.createElement('div');
        logEntry.className = type;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        logs.appendChild(logEntry);
        logs.scrollTop = logs.scrollHeight;
    }

    updateStatus(status) {
        document.getElementById('status').textContent = status;
    }

    async initialize() {
        try {
            this.log('🚀 Initializing WebSocket GraphQL monitor...', 'info');
            document.getElementById('initBtn').disabled = true;
            
            // Display configuration
            document.getElementById('currentChainId').textContent = this.CHAIN_ID;
            this.log(`⛓️ Chain ID: ${this.CHAIN_ID}`, 'success');
            this.log(`🎯 Application ID: ${this.APP_ID}`, 'success');
            this.log(`🔌 WebSocket URL: ${this.WEBSOCKET_URL}`, 'info');
            this.log(`📡 HTTP Endpoint: ${this.HTTP_ENDPOINT}`, 'info');
            
            this.isInitialized = true;
            this.updateStatus('Ready');
            
            // Enable controls
            document.getElementById('startBtn').disabled = false;
            document.getElementById('queryOnceBtn').disabled = false;
            
            this.log('✅ Initialization complete!', 'success');
            
        } catch (error) {
            this.log(`❌ Initialization failed: ${error.message}`, 'error');
            console.error('Initialization error:', error);
            document.getElementById('initBtn').disabled = false;
        }
    }

    connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.log('🔌 Connecting to WebSocket with graphql-transport-ws protocol...', 'info');
                
                // Create WebSocket with graphql-transport-ws protocol
                this.ws = new WebSocket(this.WEBSOCKET_URL, 'graphql-transport-ws');
                
                // Set connection timeout (5 seconds)
                this.connectionTimeout = setTimeout(() => {
                    this.log('⏰ WebSocket connection timeout (5s), falling back to polling', 'error');
                    if (this.ws) {
                        this.ws.close();
                    }
                    reject(new Error('Connection timeout'));
                }, 5000);
                
                this.ws.onopen = () => {
                    clearTimeout(this.connectionTimeout);
                    this.log('✅ WebSocket connected', 'success');
                    
                    // Send connection_init message exactly as in your working example
                    const initMessage = {
                        "type": "connection_init",
                        "payload": {}
                    };
                    this.ws.send(JSON.stringify(initMessage));
                    this.log('📤 Sent connection_init: ' + JSON.stringify(initMessage), 'info');
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleWebSocketMessage(message, resolve, reject);
                    } catch (error) {
                        this.log(`❌ Error parsing WebSocket message: ${error.message}`, 'error');
                        this.log(`Raw message: ${event.data}`, 'error');
                    }
                };
                
                this.ws.onerror = (error) => {
                    clearTimeout(this.connectionTimeout);
                    this.log(`❌ WebSocket error: ${error.message || 'Connection failed'}`, 'error');
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    clearTimeout(this.connectionTimeout);
                    this.log(`🔌 WebSocket closed (Code: ${event.code}, Reason: ${event.reason || 'No reason'})`, 'info');
                    
                    // Auto-reconnect if still listening
                    if (this.isListening && event.code !== 1000) { // 1000 = normal closure
                        this.log('🔄 Attempting to reconnect in 3 seconds...', 'info');
                        setTimeout(() => {
                            if (this.isListening) {
                                this.connectWebSocket().catch(() => {
                                    this.log('⚠️ Reconnection failed, falling back to polling', 'error');
                                    this.fallbackToPolling();
                                });
                            }
                        }, 3000);
                    }
                };
                
            } catch (error) {
                clearTimeout(this.connectionTimeout);
                this.log(`❌ WebSocket creation failed: ${error.message}`, 'error');
                reject(error);
            }
        });
    }
    
    handleWebSocketMessage(message, resolve, reject) {
        this.log(`📨 WebSocket message: ${JSON.stringify(message)}`, 'info');
        
        switch (message.type) {
            case 'connection_ack':
                this.log('✅ Connection acknowledged (ACK received)', 'success');
                this.subscribeToNotifications();
                resolve();
                break;
                
            case 'next':
                if (message.id === "1") {
                    this.log('🔔 Blockchain notification received!', 'success');
                    this.log(`📨 Notification payload: ${JSON.stringify(message.payload)}`, 'info');
                    // Trigger GraphQL query when notification received
                    this.queryGraphQL();
                }
                break;
                
            case 'error':
                this.log(`❌ Subscription error: ${JSON.stringify(message.payload)}`, 'error');
                reject(new Error(JSON.stringify(message.payload)));
                break;
                
            case 'complete':
                this.log('✅ Subscription completed', 'info');
                break;
                
            default:
                this.log(`🤔 Unknown message type: ${message.type}`, 'info');
        }
    }
    
    subscribeToNotifications() {
        // Send subscription message exactly as in your working example
        const subscriptionMessage = {
            "id": "1",
            "type": "subscribe",
            "payload": {
                "query": `subscription { notifications(chainId: "${this.CHAIN_ID}") }`
            }
        };
        
        this.ws.send(JSON.stringify(subscriptionMessage));
        this.log(`📡 Sent subscription: ${JSON.stringify(subscriptionMessage)}`, 'success');
        this.log(`🎯 Listening for notifications on chain: ${this.CHAIN_ID}`, 'info');
    }

    async queryGraphQL() {
        try {
            this.log('🔍 Querying GraphQL via HTTP...', 'info');
            
            const httpResponse = await fetch(this.HTTP_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ query: this.GRAPHQL_QUERY })
            });
            
            if (!httpResponse.ok) {
                throw new Error(`HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
            }
            
            const data = await httpResponse.json();
            this.queryCount++;
            document.getElementById('lastEvent').textContent = new Date().toLocaleTimeString();
            
            // Determine trigger source
            const triggerSource = this.ws && this.ws.readyState === WebSocket.OPEN ? 'WebSocket Event' : 'HTTP Polling';
            this.log(`✅ GraphQL query successful (Triggered by: ${triggerSource})`, 'success');
            
            // Create formatted response display
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response';
            responseDiv.innerHTML = `
                <strong>Query #${this.queryCount} - Triggered by ${triggerSource}:</strong>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            document.getElementById('logs').appendChild(responseDiv);
            document.getElementById('logs').scrollTop = document.getElementById('logs').scrollHeight;
            
            return data;
            
        } catch (error) {
            this.log(`❌ GraphQL query failed: ${error.message}`, 'error');
            console.error('Query error:', error);
        }
    }

    async startMonitoring() {
        if (!this.isInitialized || this.isListening) return;
        
        this.isListening = true;
        this.updateStatus('Connecting...');
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        
        // Try WebSocket with graphql-transport-ws protocol first
        try {
            await this.connectWebSocket();
            this.updateStatus('Listening (WebSocket)');
            this.log('🎉 Event-driven monitoring active via WebSocket!', 'success');
            
            // Initial query
            this.queryGraphQL();
            
        } catch (error) {
            this.log('⚠️ WebSocket connection failed, falling back to HTTP polling', 'error');
            this.fallbackToPolling();
        }
    }
    
    fallbackToPolling() {
        const interval = parseInt(document.getElementById('interval').value);
        this.updateStatus('Listening (HTTP Polling)');
        this.log(`🔄 Starting HTTP polling every ${interval}ms`, 'info');
        
        this.queryGraphQL(); // Initial query
        this.pollingInterval = setInterval(() => this.queryGraphQL(), interval);
    }

    stopMonitoring() {
        if (!this.isListening) return;
        
        this.isListening = false;
        this.updateStatus('Stopped');
        
        // Close WebSocket if connected
        if (this.ws) {
            // Send unsubscribe message exactly as in protocol
            if (this.ws.readyState === WebSocket.OPEN) {
                const unsubscribeMessage = {
                    "id": "1",
                    "type": "complete"
                };
                this.ws.send(JSON.stringify(unsubscribeMessage));
                this.log('📤 Sent unsubscribe: ' + JSON.stringify(unsubscribeMessage), 'info');
            }
            
            this.ws.close(1000, 'Normal closure');
            this.ws = null;
            this.log('🔌 WebSocket disconnected', 'info');
        }
        
        // Clear polling interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        // Clear connection timeout
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        this.log('⏹️ Stopped monitoring', 'info');
    }

    clearLogs() {
        document.getElementById('logs').innerHTML = '';
        this.queryCount = 0;
        this.updateStatus(this.isInitialized ? 'Ready' : 'Not initialized');
    }

    queryOnce() {
        if (!this.isInitialized) {
            this.log('❌ Please initialize first', 'error');
            return;
        }
        this.log('⚡ Executing single query...', 'info');
        this.queryGraphQL();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new WebSocketGraphQLMonitor();
    
    // Add event listeners for buttons
    document.getElementById('initBtn').addEventListener('click', () => app.initialize());
    document.getElementById('startBtn').addEventListener('click', () => app.startMonitoring());
    document.getElementById('stopBtn').addEventListener('click', () => app.stopMonitoring());
    document.getElementById('clearBtn').addEventListener('click', () => app.clearLogs());
    document.getElementById('queryOnceBtn').addEventListener('click', () => app.queryOnce());
    
    // Initialize
    app.updateStatus('Not initialized');
    app.log('🔌 WebSocket GraphQL Monitor ready', 'success');
    app.log('🎯 Uses graphql-transport-ws protocol for real-time notifications', 'info');
    app.log('💡 Will try WebSocket first, fallback to polling if needed', 'info');
    app.log('Click "Initialize" to start', 'info');
});