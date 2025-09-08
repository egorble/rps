import * as linera from '@linera/client';

class BlockchainEventListener {
    constructor() {
        this.lineraClient = null;
        this.backend = null;
        this.queryCount = 0;
        this.blockCount = 0;
        this.isInitialized = false;
        this.isListening = false;
        this.pollingInterval = null;
        
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
        document.getElementById('blockCount').textContent = this.blockCount;
    }

    async initializeLinera() {
        try {
            this.log('🔄 Initializing Linera client...', 'info');
            document.getElementById('initBtn').disabled = true;
            
            // Initialize the WebAssembly module
            await linera.default();
            this.log('✅ Linera WebAssembly initialized', 'success');
            
            // Since you already have the endpoint, we'll use a minimal wallet approach
            // Create a client without faucet dependency
            this.log('🔗 Creating Linera client for existing chain...', 'info');
            
            // Use existing chain and application IDs
            const chainId = document.getElementById('chainId').value;
            const appId = document.getElementById('appId').value;
            
            document.getElementById('currentChainId').textContent = chainId;
            this.log(`⛓️ Using existing chain: ${chainId}`, 'success');
            
            // For existing chains, we'll try to create a wallet from the chain info
            // This approach works with already deployed applications
            try {
                // Create a minimal wallet for the existing chain
                const wallet = await this.createMinimalWallet(chainId);
                this.lineraClient = await new linera.Client(wallet);
                this.log('🔗 Linera client created', 'success');
                
                // Get application backend
                this.backend = await this.lineraClient.frontend().application(appId);
                this.log(`🎯 Connected to application: ${appId}`, 'success');
                
            } catch (clientError) {
                this.log(`⚠️ Client creation failed: ${clientError.message}`, 'error');
                this.log('📡 Will use direct HTTP GraphQL queries', 'info');
                this.backend = null;
            }
            
            this.isInitialized = true;
            this.updateStatus('Initialized');
            
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
    
    async createMinimalWallet(chainId) {
        // Create a minimal wallet configuration for existing chain
        // This is a simplified approach for read-only operations
        const walletConfig = {
            chains: [chainId],
            default_chain: chainId
        };
        
        try {
            return await linera.Wallet.fromJson(JSON.stringify(walletConfig));
        } catch (error) {
            // If wallet creation fails, we'll fall back to direct HTTP
            throw new Error('Cannot create wallet for existing chain');
        }
    }

    async queryGraphQL() {
        try {
            this.log('🔍 Querying GraphQL...', 'info');
            
            let data;
            
            if (this.backend) {
                // Use Linera client backend
                const response = await this.backend.query(JSON.stringify({
                    query: this.GRAPHQL_QUERY
                }));
                data = JSON.parse(response);
                this.log('✅ Query via Linera client successful', 'success');
            } else {
                // Use direct HTTP request to your endpoint
                const endpoint = 'http://localhost:8080/chains/47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021/applications/dfe2a342d5003570740d71be2541021950060ffe8a5e1ae53e96b58cd2d2ae5d';
                
                const httpResponse = await fetch(endpoint, {
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
                
                data = await httpResponse.json();
                this.log('✅ Direct HTTP GraphQL query successful', 'success');
            }
            
            this.queryCount++;
            document.getElementById('lastEvent').textContent = new Date().toLocaleTimeString();
            
            // Create formatted response display
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response';
            responseDiv.innerHTML = `
                <strong>Query #${this.queryCount} Response:</strong>
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

    startListening() {
        if (!this.isInitialized || this.isListening) return;
        
        const connectionMode = document.getElementById('connectionMode').value;
        
        this.isListening = true;
        this.updateStatus('Listening');
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        
        if (connectionMode === 'event' && this.lineraClient) {
            this.log('👂 Starting event-driven listening for new blocks...', 'success');
            
            // Set up notification listener for new blocks
            this.lineraClient.onNotification(notification => {
                this.log(`📡 Notification received: ${JSON.stringify(notification)}`, 'info');
                
                if (notification.reason && notification.reason.NewBlock) {
                    this.blockCount++;
                    this.log(`🆕 New block detected! Block #${this.blockCount}`, 'success');
                    this.updateStatus('New block detected');
                    
                    // Query the GraphQL endpoint when new block arrives
                    this.queryGraphQL();
                }
            });
            
            // Initial query
            this.queryGraphQL();
            
        } else {
            // Fallback to polling (works with or without Linera client)
            const interval = parseInt(document.getElementById('interval').value);
            this.log(`🔄 Starting polling mode every ${interval}ms`, 'info');
            
            this.queryGraphQL(); // Initial query
            this.pollingInterval = setInterval(() => this.queryGraphQL(), interval);
        }
    }

    stopListening() {
        if (!this.isListening) return;
        
        this.isListening = false;
        this.updateStatus('Stopped');
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        
        this.log('⏹️ Stopped listening', 'info');
    }

    clearLogs() {
        document.getElementById('logs').innerHTML = '';
        this.queryCount = 0;
        this.blockCount = 0;
        this.updateStatus(this.isInitialized ? 'Initialized' : 'Not initialized');
    }

    queryOnce() {
        if (!this.isInitialized) {
            this.log('❌ Please initialize Linera client first', 'error');
            return;
        }
        this.log('⚡ Executing single query...', 'info');
        this.queryGraphQL();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new BlockchainEventListener();
    
    // Add event listeners for buttons
    document.getElementById('initBtn').addEventListener('click', () => app.initializeLinera());
    document.getElementById('startBtn').addEventListener('click', () => app.startListening());
    document.getElementById('stopBtn').addEventListener('click', () => app.stopListening());
    document.getElementById('clearBtn').addEventListener('click', () => app.clearLogs());
    document.getElementById('queryOnceBtn').addEventListener('click', () => app.queryOnce());
    
    // Handle connection mode changes
    document.getElementById('connectionMode').addEventListener('change', function() {
        const pollingSection = document.getElementById('pollingSection');
        if (this.value === 'polling') {
            pollingSection.style.display = 'block';
        } else {
            pollingSection.style.display = 'none';
        }
    });
    
    // Initialize
    app.updateStatus('Not initialized');
    app.log('⛓️ Blockchain Event Listener ready', 'success');
    app.log('Click "Initialize Linera" to connect to the blockchain', 'info');
    app.log('💡 Event-driven mode will automatically query when new blocks are detected', 'info');
});