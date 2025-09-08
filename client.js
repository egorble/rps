import WebSocket from 'ws';
import axios from 'axios';

class GraphQLWebSocketClient {
    constructor(endpoint, query, interval = 5000) {
        this.endpoint = endpoint;
        this.query = query;
        this.interval = interval;
        this.ws = null;
        this.queryTimer = null;
        this.isConnected = false;
    }

    async queryGraphQL() {
        try {
            console.log('🔍 Sending GraphQL query...');
            const response = await axios.post(this.endpoint, {
                query: this.query
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            console.log('✅ Query successful:', new Date().toISOString());
            console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
            console.log('─'.repeat(80));
            
            return response.data;
        } catch (error) {
            console.error('❌ GraphQL Query Error:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            console.log('─'.repeat(80));
        }
    }

    startContinuousQuerying() {
        console.log(`🚀 Starting continuous GraphQL queries every ${this.interval}ms`);
        console.log(`🎯 Target endpoint: ${this.endpoint}`);
        console.log(`📝 Query: ${this.query}`);
        console.log('─'.repeat(80));

        // Execute first query immediately
        this.queryGraphQL();

        // Set up interval for continuous querying
        this.queryTimer = setInterval(() => {
            this.queryGraphQL();
        }, this.interval);
    }

    stopQuerying() {
        if (this.queryTimer) {
            clearInterval(this.queryTimer);
            this.queryTimer = null;
            console.log('⏹️ Stopped continuous querying');
        }
    }

    // Optional: Create WebSocket connection for real-time updates
    connectWebSocket(wsEndpoint) {
        try {
            console.log(`🔌 Connecting to WebSocket: ${wsEndpoint}`);
            this.ws = new WebSocket(wsEndpoint);

            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                this.isConnected = true;
                
                // Send subscription or initial message if needed
                this.ws.send(JSON.stringify({
                    type: 'connection_init'
                }));
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('📨 WebSocket message received:', message);
                } catch (error) {
                    console.log('📨 WebSocket raw message:', data.toString());
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ WebSocket connection failed:', error.message);
        }
    }

    disconnect() {
        this.stopQuerying();
        if (this.ws && this.isConnected) {
            this.ws.close();
        }
    }
}

// Configuration
const GRAPHQL_ENDPOINT = 'http://localhost:8080/chains/47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021/applications/dfe2a342d5003570740d71be2541021950060ffe8a5e1ae53e96b58cd2d2ae5d';
const GRAPHQL_QUERY = `query{
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

// Create and start the client
const client = new GraphQLWebSocketClient(GRAPHQL_ENDPOINT, GRAPHQL_QUERY, 3000); // Query every 3 seconds

// Start continuous querying
client.startContinuousQuerying();

// Optional: Try to connect to WebSocket if available
// Uncomment the line below if you have a WebSocket endpoint
// client.connectWebSocket('ws://localhost:8080/ws');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.disconnect();
    process.exit(0);
});

// Keep the process running
console.log('Press Ctrl+C to stop the client');