// Linera GraphQL client for Rock Paper Scissors game
// Constants as specified
const BASE_URL = "http://localhost:8080";
const APP_ID = "46dfe0d1a83e96587e1a60197adcefe6958a41a6916de0ed0043e4621a77bb50";
const READ_CHAIN_ID = "47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021";

class LineraGameClient {
    constructor() {
        this.playerChainId = null;
        this.playerOwner = null;
        this.isInitialized = false;
    }

    // Initialize player chain when entering the game
    async initializePlayer(chainId, owner, balance = 1000000) {
        try {
            console.log('Initializing player chain:', chainId);
            
            const mutation = `
                mutation OpenChain($chainId: String!, $owner: String!, $balance: Int!) {
                    openChain(chainId: $chainId, owner: $owner, balance: $balance)
                }
            `;

            const response = await this.makeGraphQLRequest(BASE_URL, mutation, {
                chainId,
                owner,
                balance
            });

            if (response.errors) {
                throw new Error(`Chain initialization failed: ${response.errors[0].message}`);
            }

            this.playerChainId = chainId;
            this.playerOwner = owner;
            this.isInitialized = true;
            
            console.log('Player chain initialized successfully');
            return response.data.openChain;
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

        const roomId = crypto.randomUUID();
        console.log('Creating private room:', roomId);

        try {
            const mutation = `
                mutation CreateRoom($private: Boolean!, $roomId: String!) {
                    createRoom(private: $private, roomId: $roomId) {
                        roomId
                        private
                        player1
                        player2
                    }
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
            return { roomId, ...response.data.createRoom };
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
            const roomId = crypto.randomUUID();
            
            const createResult = await this.createPublicRoom(roomId);
            
            // Join the room we just created to ensure player is added
            try {
                await this.joinRoom(roomId);
            } catch (error) {
                console.log('Note: Could not auto-join created room (might be automatic):', error.message);
            }

            return { roomId, ...createResult };
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
                    createRoom(private: $private, roomId: $roomId) {
                        roomId
                        private
                        player1
                        player2
                    }
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
            return response.data.createRoom;
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

        try {
            const mutation = `
                mutation JoinRoom($roomId: String!) {
                    joinRoom(roomId: $roomId) {
                        roomId
                        player1
                        player2
                    }
                }
            `;

            const response = await this.makeGraphQLRequest(
                this.getPlayerChainEndpoint(),
                mutation,
                { roomId }
            );

            if (response.errors) {
                throw new Error(`Failed to join room: ${response.errors[0].message}`);
            }

            console.log('Successfully joined room:', roomId);
            return response.data.joinRoom;
        } catch (error) {
            console.error('Failed to join room:', error);
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
                    submitChoice(roomId: $roomId, choice: $choice) {
                        success
                    }
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
            return response.data.submitChoice;
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
                        gameResult {
                            player1Wins
                            player2Wins
                            draws
                            winner
                            isFinished
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

    // Utility method to make GraphQL requests
    async makeGraphQLRequest(endpoint, query, variables = {}) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`GraphQL request (attempt ${attempt}):`, endpoint);
                
                const response = await fetch(`${endpoint}/graphql`, {
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
                lastError = error;
                console.error(`GraphQL request failed (attempt ${attempt}):`, error);
                
                if (attempt < maxRetries) {
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }

        throw lastError;
    }

    // Helper methods for endpoints
    getPlayerChainEndpoint() {
        return `${BASE_URL}/chains/${this.playerChainId}/applications/${APP_ID}`;
    }

    getReadChainEndpoint() {
        return `${BASE_URL}/chains/${READ_CHAIN_ID}/applications/${APP_ID}`;
    }

    // Poll for room updates (alternative to WebSocket)
    startPollingRoomState(roomId, callback, interval = 2000) {
        const poll = async () => {
            try {
                const roomState = await this.getRoomState(roomId);
                callback(null, roomState);
            } catch (error) {
                callback(error, null);
            }
        };

        // Initial poll
        poll();
        
        // Set up interval polling
        const intervalId = setInterval(poll, interval);
        
        // Return function to stop polling
        return () => clearInterval(intervalId);
    }
}

// Export for use in React components
export default LineraGameClient;