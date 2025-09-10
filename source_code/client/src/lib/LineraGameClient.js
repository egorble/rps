// Linera GraphQL client for Rock Paper Scissors game
// Constants as specified
const BASE_URL = "http://62.72.35.202:8080";
const APP_ID = "39f4c13960411fb384018674e20706bb81d728905937fb3d6d61149e94d9de85";
const READ_CHAIN_ID = "349cb0da052a21eb26879aae2893fde1a1d1c14bca3894b09d1bdc6f60ec8bc4";
const OWNER_ACCOUNT = "0xd25f8454ffd3398bbceb93ad3f75582cc022bc6233e0627fa9a87ca3e27ab5b7";

// Helper function to generate UUID using Math.random()
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class LineraGameClient {
    constructor() {
        this.playerChainId = null;
        this.playerOwner = null;
        this.isInitialized = false;
        this.joinedRooms = new Set(); // Track rooms we've already joined
        this.ws = null;
        this.wsConnectionPromise = null; // Track connection promise
        this.roomCallbacks = new Map(); // Map room IDs to callback functions
        this.leaderboardCallback = null; // Callback for leaderboard updates
        this.reconnectTimeout = null;
        this.isConnecting = false;
        this.isPaused = false; // Track if WebSocket monitoring is paused
        this.pendingNotifications = []; // Queue for notifications during pause
    }

    // Initialize player chain when entering the game
    async initializePlayer(chainId = READ_CHAIN_ID, owner = OWNER_ACCOUNT, balance = "1") {
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('Player already initialized, returning existing chain ID:', this.playerChainId);
            return this.playerChainId;
        }
        
        try {
            // Initialize player chain using openChain mutation
            console.log('Initializing player chain:', chainId);
            console.log('Using owner account:', owner);
            
            const mutation = `
                mutation OpenChain($chainId: String!, $owner: String!, $balance: String!) {
                    openChain(chainId: $chainId, owner: $owner, balance: $balance)
                }
            `;
            
            const variables = { 
                chainId, 
                owner, 
                balance: balance.toString() 
            };

            const response = await fetch(BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query: mutation,
                    variables
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('OpenChain response:', data);

            if (data.errors) {
                throw new Error(`Chain initialization failed: ${data.errors[0].message}`);
            }

            // Use the chain ID returned from openChain as the player chain
            const newChainId = data.data.openChain; // This should be the new chain ID
            this.playerChainId = newChainId;
            this.playerOwner = owner;
            this.isInitialized = true;
            
            console.log('New player chain created successfully:', newChainId);
            console.log('Player chain ID set to:', this.playerChainId);
            
            // Immediately execute setupLeaderboard mutation on the new player chain
            try {
                await this.setupLeaderboard();
                console.log('Leaderboard setup completed during initialization');
            } catch (leaderboardError) {
                console.warn('Leaderboard setup failed but continuing:', leaderboardError.message);
                // Continue even if leaderboard setup fails
            }
            
            return newChainId;
        } catch (error) {
            console.error('Failed to initialize player chain:', error);
            throw error;
        }
    }

    // Create a private room (Play with friend)
    async createPrivateRoom() {
        if (!this.isInitialized) {
            throw new Error('Player not initialized. Call initializePlayer first.');
        }

        const roomId = generateUUID();
        console.log('Creating private room:', roomId);

        try {
            const mutation = `
                mutation CreateRoom($private: Boolean!, $roomId: String!) {
                    createRoom(private: $private, roomId: $roomId)
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getReadChainEndpoint(),
                mutation,
                { private: true, roomId }
            );

            if (response.errors) {
                throw new Error(`Failed to create private room: ${response.errors[0].message}`);
            }

            console.log('Private room created successfully:', roomId);
            return { roomId, result: 'room_created' };
        } catch (error) {
            console.error('Failed to create private room:', error);
            throw error;
        }
    }

    // Play with strangers logic
    async playWithStrangers() {
        if (!this.isInitialized) {
            throw new Error('Player not initialized. Call initializePlayer first.');
        }

        try {
            // First, get available rooms
            const availableRooms = await this.getAvailableRooms();
            console.log('Available rooms:', availableRooms);

            // Try to join an existing room
            if (availableRooms && availableRooms.length > 0) {
                for (const room of availableRooms) {
                    try {
                        const joinResult = await this.joinRoom(room.roomId);
                        console.log('Successfully joined room:', room.roomId);
                        return { roomId: room.roomId, ...joinResult };
                    } catch (error) {
                        console.log(`Failed to join room ${room.roomId}:`, error.message);
                        // Continue to next room or create new one
                        continue;
                    }
                }
            }

            // No available rooms or all join attempts failed - create new public room
            console.log('Creating new public room');
            const roomId = generateUUID();
            
            const createResult = await this.createPublicRoom(roomId);
            
            // Join the room we just created to ensure player is added
            try {
                await this.joinRoom(roomId);
            } catch (error) {
                console.log('Note: Could not auto-join created room (might be automatic):', error.message);
            }

            // Return consistent structure
            return { roomId, result: 'room_created' };
        } catch (error) {
            console.error('Failed to play with strangers:', error);
            throw error;
        }
    }

    // Get available rooms
    async getAvailableRooms() {
        try {
            const query = `
                query AvailableRooms {
                    availableRooms {
                        roomId
                    }
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getReadChainEndpoint(),
                query
            );

            if (response.errors) {
                throw new Error(`Failed to get available rooms: ${response.errors[0].message}`);
            }

            return response.data.availableRooms;
        } catch (error) {
            console.error('Failed to get available rooms:', error);
            throw error;
        }
    }

    // Create public room
    async createPublicRoom(roomId) {
        try {
            const mutation = `
                mutation CreateRoom($private: Boolean!, $roomId: String!) {
                    createRoom(private: $private, roomId: $roomId)
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getReadChainEndpoint(),
                mutation,
                { private: false, roomId }
            );

            if (response.errors) {
                throw new Error(`Failed to create public room: ${response.errors[0].message}`);
            }

            console.log('Public room created successfully:', roomId);
            return { roomId, result: 'room_created' };
        } catch (error) {
            console.error('Failed to create public room:', error);
            throw error;
        }
    }

    // Join a room
    async joinRoom(roomId) {
        if (!this.isInitialized) {
            throw new Error('Player not initialized. Call initializePlayer first.');
        }

        if (!this.playerChainId) {
            throw new Error('Player chain ID not set. Cannot join room.');
        }

        // Prevent multiple join attempts for the same room
        if (this.joinedRooms.has(roomId)) {
            console.log(`Already attempted to join room ${roomId}, skipping duplicate attempt`);
            return { roomId, result: 'already_joined' };
        }

        // Mark this room as being joined
        this.joinedRooms.add(roomId);
        console.log(`Joining room ${roomId} using player chain: ${this.playerChainId}`);

        try {
            const mutation = `
                mutation JoinRoom($roomId: String!) {
                    joinRoom(roomId: $roomId)
                }
            `;

            const playerEndpoint = this.getPlayerChainEndpoint();
            console.log(`Using player endpoint: ${playerEndpoint}`);

            const response = await this.makeGraphQLRequest(
                playerEndpoint,
                mutation,
                { roomId }
            );

            if (response.errors) {
                throw new Error(`Failed to join room: ${response.errors[0].message}`);
            }

            console.log('Successfully joined room:', roomId, 'Result:', response.data.joinRoom);
            return { roomId, result: response.data.joinRoom };
        } catch (error) {
            console.error('Failed to join room:', error);
            console.error('Player chain ID:', this.playerChainId);
            console.error('Player endpoint:', this.getPlayerChainEndpoint());
            throw error;
        }
    }

    // Submit choice (rock/paper/scissors)
    async submitChoice(roomId, choice) {
        if (!this.isInitialized) {
            throw new Error('Player not initialized. Call initializePlayer first.');
        }

        if (!['ROCK', 'PAPER', 'SCISSORS'].includes(choice)) {
            throw new Error('Invalid choice. Must be ROCK, PAPER, or SCISSORS');
        }

        try {
            const mutation = `
                mutation SubmitChoice($roomId: String!, $choice: Choice!) {
                    submitChoice(roomId: $roomId, choice: $choice)
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getPlayerChainEndpoint(),
                mutation,
                { roomId, choice }
            );

            if (response.errors) {
                throw new Error(`Failed to submit choice: ${response.errors[0].message}`);
            }

            console.log('Choice submitted successfully:', choice);
            return { success: true, result: response.data.submitChoice };
        } catch (error) {
            console.error('Failed to submit choice:', error);
            throw error;
        }
    }

    // Get room state (for UI updates)
    async getRoomState(roomId) {
      try {
        const query = `
          query GetRoom($roomId: String!) {
            room(roomId: $roomId) {
              roomId
              private
              player1
              player2
              player1Choice
              player2Choice
              player1Name
              player2Name
              gameResult {
                player1Wins
                player2Wins
                draws
                winner
                isFinished
              }
              roundHistory {
                roundNumber
                player1Choice
                player2Choice
                result
                winner
              }
            }
          }
        `;

        const response = await this.makeGraphQLRequest(
          this.getReadChainEndpoint(),
          query,
          { roomId }
        );

        if (response.errors) {
          throw new Error(`Failed to get room state: ${response.errors[0].message}`);
        }

        return response.data.room;
      } catch (error) {
        console.error('Failed to get room state:', error);
        throw error;
      }
    }

    // WebSocket notification system - simplified and persistent
    async ensureWebSocketConnection() {
        // Return existing connection if available
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        // Return existing connection promise if already connecting
        if (this.isConnecting && this.wsConnectionPromise) {
            return this.wsConnectionPromise;
        }

        // Create new connection
        this.isConnecting = true;
        this.wsConnectionPromise = new Promise((resolve, reject) => {
            try {
                console.log('🔌 Establishing WebSocket connection with graphql-transport-ws protocol...');
                
                const wsUrl = 'ws://62.72.35.202:8080/ws';
                this.ws = new WebSocket(wsUrl, 'graphql-transport-ws');
                
                const connectionTimeout = setTimeout(() => {
                    console.warn('⏰ WebSocket connection timeout (5s)');
                    if (this.ws) {
                        this.ws.close();
                    }
                    this.isConnecting = false;
                    reject(new Error('WebSocket connection timeout'));
                }, 5000);
                
                this.ws.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('✅ WebSocket connected successfully');
                    
                    // Send connection_init message
                    const initMessage = {
                        "type": "connection_init",
                        "payload": {}
                    };
                    this.ws.send(JSON.stringify(initMessage));
                    console.log('📤 Sent connection_init');
                };
                
                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleWebSocketMessage(message, resolve, reject);
                    } catch (error) {
                        console.error('❌ Error parsing WebSocket message:', error);
                    }
                };
                
                this.ws.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('❌ WebSocket error:', error.message || 'Connection failed');
                    this.isConnecting = false;
                    reject(error);
                };
                
                this.ws.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    console.log(`🔌 WebSocket closed (Code: ${event.code})`);
                    this.isConnecting = false;
                    this.ws = null;
                    this.wsConnectionPromise = null;
                    
                    // Auto-reconnect if there are active room callbacks
                    if (this.roomCallbacks.size > 0 && event.code !== 1000) {
                        this.scheduleReconnect();
                    }
                };
                
            } catch (error) {
                console.error('❌ WebSocket creation failed:', error);
                this.isConnecting = false;
                reject(error);
            }
        });

        return this.wsConnectionPromise;
    }

    handleWebSocketMessage(message, resolve, reject) {
        console.log('📩 WebSocket message:', message.type);
        
        switch (message.type) {
            case 'connection_ack':
                console.log('✅ Connection acknowledged by server');
                this.subscribeToChainNotifications();
                this.isConnecting = false;
                if (resolve) resolve();
                break;
                
            case 'next':
                if (message.id === 'chain_notifications') {
                    console.log('🔔 Blockchain notification received!');
                    this.handleBlockchainNotification(message.payload);
                }
                break;
                
            case 'error':
                console.error('❌ Subscription error:', JSON.stringify(message.payload));
                this.isConnecting = false;
                if (reject) reject(new Error(JSON.stringify(message.payload)));
                break;
                
            case 'complete':
                console.log('✅ Subscription completed for ID:', message.id);
                break;
                
            case 'ping':
                const pongMessage = { type: 'pong' };
                this.ws.send(JSON.stringify(pongMessage));
                console.log('🏓 Sent pong response');
                break;
                
            default:
                console.log(`🤔 Unknown message type: ${message.type}`);
        }
    }

    subscribeToChainNotifications() {
        const subscriptionMessage = {
            "id": "chain_notifications",
            "type": "subscribe",
            "payload": {
                "query": `subscription { notifications(chainId: "${READ_CHAIN_ID}") }`
            }
        };
        
        this.ws.send(JSON.stringify(subscriptionMessage));
        console.log('📡 Subscribed to blockchain notifications on chain:', READ_CHAIN_ID);
    }

    async handleBlockchainNotification(payload) {
        console.log('🔔 Blockchain event - updating all monitored rooms');
        
        // If monitoring is paused, queue the notification
        if (this.isPaused) {
            console.log('⏸️ Monitoring paused, queuing notification');
            this.pendingNotifications.push(payload);
            return;
        }
        
        // When we receive a blockchain notification, update all monitored rooms
        for (const [roomId, callback] of this.roomCallbacks) {
            try {
                const roomState = await this.getRoomState(roomId);
                callback(null, roomState);
            } catch (error) {
                console.error(`Failed to update room state for ${roomId}:`, error);
                callback(error, null);
            }
        }
        
        // If there's a leaderboard callback, notify it as well
        if (this.leaderboardCallback) {
            try {
                this.leaderboardCallback();
            } catch (error) {
                console.error('Failed to notify leaderboard callback:', error);
            }
        }
    }

    // Pause WebSocket monitoring during animations
    pauseMonitoring() {
        console.log('⏸️ Pausing WebSocket monitoring');
        this.isPaused = true;
    }

    // Resume WebSocket monitoring after animations
    async resumeMonitoring() {
        console.log('▶️ Resuming WebSocket monitoring');
        this.isPaused = false;
        
        // Process any pending notifications that arrived during pause
        if (this.pendingNotifications.length > 0) {
            console.log(`🔁 Processing ${this.pendingNotifications.length} queued notifications`);
            while (this.pendingNotifications.length > 0) {
                const payload = this.pendingNotifications.shift();
                await this.handleBlockchainNotification(payload);
            }
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        
        console.log('🔄 Attempting to reconnect WebSocket in 3 seconds...');
        this.reconnectTimeout = setTimeout(() => {
            if (this.roomCallbacks.size > 0) {
                this.ensureWebSocketConnection().catch(() => {
                    console.warn('⚠️ Reconnection failed, will retry on next request');
                });
            }
        }, 3000);
    }

    // Simple room monitoring - no complex cleanup management
    async startRoomMonitoring(roomId, callback) {
        console.log(`🎯 Starting monitoring for room: ${roomId}`);
        
        // Simply store the callback
        this.roomCallbacks.set(roomId, callback);
        console.log(`📋 Active room monitoring count: ${this.roomCallbacks.size}`);
        
        try {
            // Ensure WebSocket connection
            await this.ensureWebSocketConnection();
            console.log(`✅ WebSocket ready for room ${roomId}`);
            
            // Get initial room state
            const roomState = await this.getRoomState(roomId);
            callback(null, roomState);
            
        } catch (error) {
            console.error(`❌ Failed to start monitoring for room ${roomId}:`, error);
            callback(error, null);
        }
    }

    // Simple room monitoring stop
    stopRoomMonitoring(roomId) {
        console.log(`⏹️ Stopping monitoring for room: ${roomId}`);
        
        const wasMonitoring = this.roomCallbacks.has(roomId);
        this.roomCallbacks.delete(roomId);
        
        if (wasMonitoring) {
            console.log(`📋 Active room monitoring count: ${this.roomCallbacks.size}`);
        } else {
            console.log(`⚠️ Room ${roomId} was not being monitored`);
        }
        
        // Keep WebSocket open as long as there might be other rooms
        // Only close on app shutdown or explicit disconnect
    }

    // Disconnect WebSocket (for app shutdown)
    disconnectWebSocket() {
        console.log('🔌 Disconnecting WebSocket');
        
        this.roomCallbacks.clear();
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const completeMessage = {
                "id": "chain_notifications",
                "type": "complete"
            };
            this.ws.send(JSON.stringify(completeMessage));
            this.ws.close(1000, 'Normal closure');
        }
        
        this.ws = null;
        this.wsConnectionPromise = null;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    // Utility method to make GraphQL requests
    async makeGraphQLRequest(endpoint, query, variables = {}) {
        try {
            console.log(`GraphQL request:`, endpoint);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Handle GraphQL errors
            if (data.errors && data.errors.length > 0) {
                const error = new Error(data.errors[0].message);
                error.graphqlErrors = data.errors;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`GraphQL request failed:`, error);
            throw error;
        }
    }

    // Setup leaderboard on player chain
    async setupLeaderboard() {
        if (!this.isInitialized || !this.playerChainId) {
            throw new Error('Player chain not initialized. Cannot setup leaderboard.');
        }

        console.log('Setting up leaderboard on player chain:', this.playerChainId);

        try {
            const mutation = `
                mutation {
                    setupLeaderboard(leaderboardChainId: "349cb0da052a21eb26879aae2893fde1a1d1c14bca3894b09d1bdc6f60ec8bc4")
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getPlayerChainEndpoint(),
                mutation
            );

            if (response.errors) {
                throw new Error(`Failed to setup leaderboard: ${response.errors[0].message}`);
            }

            console.log('Leaderboard setup completed successfully:', response.data.setupLeaderboard);
            return response.data.setupLeaderboard;
        } catch (error) {
            console.error('Failed to setup leaderboard:', error);
            throw error;
        }
    }

    // Start leaderboard monitoring
    async startLeaderboardMonitoring(callback) {
        console.log('🎯 Starting leaderboard monitoring');
        
        // Store the callback
        this.leaderboardCallback = callback;
        
        try {
            // Ensure WebSocket connection
            await this.ensureWebSocketConnection();
            console.log('✅ WebSocket ready for leaderboard monitoring');
        } catch (error) {
            console.error('❌ Failed to start leaderboard monitoring:', error);
            throw error;
        }
    }

    // Stop leaderboard monitoring
    stopLeaderboardMonitoring() {
        console.log('⏹️ Stopping leaderboard monitoring');
        this.leaderboardCallback = null;
    }

    // Helper methods for endpoints
    getPlayerChainEndpoint() {
        if (!this.playerChainId) {
            throw new Error('Player chain ID not initialized');
        }
        const endpoint = `${BASE_URL}/chains/${this.playerChainId}/applications/${APP_ID}`;
        console.log('Player chain endpoint:', endpoint);
        return endpoint;
    }

    getReadChainEndpoint() {
        return `${BASE_URL}/chains/${READ_CHAIN_ID}/applications/${APP_ID}`;
    }

    // Method to set player chain ID directly (for login scenarios)
    setPlayerChainId(chainId) {
        if (chainId) {
            this.playerChainId = chainId;
            this.isInitialized = true;
            console.log('Player chain ID set directly:', chainId);
        }
    }
}

// Export for use in React components
export default LineraGameClient;