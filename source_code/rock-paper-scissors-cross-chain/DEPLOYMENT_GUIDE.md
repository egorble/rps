# Rock Paper Scissors Cross-Chain Deployment Guide

This guide provides step-by-step instructions for deploying and running the Rock Paper Scissors cross-chain game on Linera.

## Prerequisites

### System Requirements
- Rust 1.75 or later
- Linera SDK 0.15.0
- Git
- A terminal/command prompt

### Install Linera SDK
```bash
# Install Linera CLI
cargo install linera-service linera-client

# Or build from source
git clone https://github.com/linera-io/linera-protocol.git
cd linera-protocol
cargo install --path linera-service
cargo install --path linera-client
```

## Step 1: Project Setup

### Clone and Build
```bash
# Navigate to your project directory
cd rock-paper-scissors-cross-chain

# Build the project
cargo build --release --target wasm32-unknown-unknown
```

### Verify Build
```bash
# Check that the build was successful
cargo check
```

## Step 2: Local Network Setup

### Start Local Linera Network
```bash
# Start a local Linera network with multiple chains
linera net up --testing-prng-seed 37
```

This will create a local network with multiple chains. Note the chain IDs that are created.

### Initialize Wallet
```bash
# Initialize your wallet
linera wallet init --with-new-chain
```

## Step 3: Application Deployment

### Publish the Application
```bash
# Publish and create the application
linera project publish-and-create
```

This command will:
1. Compile the contract and service
2. Publish the bytecode to the network
3. Create an application instance
4. Return an APPLICATION_ID

**Important**: Save the APPLICATION_ID returned by this command!

### Example Output
```
Application published successfully!
Application ID: e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000
```

## Step 4: Configure Leaderboard Chain

### Choose Leaderboard Chain
Select one of your chains to serve as the leaderboard chain. You can list your chains with:
```bash
linera wallet show
```

### Setup Leaderboard
```bash
# Replace <LEADERBOARD_CHAIN_ID> with your chosen chain ID
linera project run-operation setup-leaderboard \
  --leaderboard-chain-id <LEADERBOARD_CHAIN_ID>
```

### Example
```bash
linera project run-operation setup-leaderboard \
  --leaderboard-chain-id e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65
```

## Step 5: Start Services

### Start Node Service
```bash
# Start the node service for GraphQL queries
linera service --port 8080
```

### Start Additional Chains (Optional)
If you want to simulate multiple players, start services on different ports:
```bash
# Terminal 1 - Chain 1
linera service --port 8080 --chain <CHAIN_1_ID>

# Terminal 2 - Chain 2  
linera service --port 8081 --chain <CHAIN_2_ID>

# Terminal 3 - Leaderboard Chain
linera service --port 8082 --chain <LEADERBOARD_CHAIN_ID>
```

## Step 6: Verify Deployment

### Check Application Status
```bash
# Query the application to verify it's working
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { isLeaderboardChain }"
  }'
```

### Expected Response
```json
{
  "data": {
    "isLeaderboardChain": true
  }
}
```

## Step 7: Create and Join Games

### Create a Room (Leaderboard Chain Only)
```bash
# Switch to leaderboard chain
linera wallet set-default <LEADERBOARD_CHAIN_ID>

# Create a room
linera project run-operation create-room
```

### Join a Room (Any Chain)
```bash
# Switch to player chain
linera wallet set-default <PLAYER_CHAIN_ID>

# Join room_0
linera project run-operation join-room --room-id "room_0"
```

### Submit Moves
```bash
# Player 1 submits Rock
linera project run-operation submit-choice --room-id "room_0" --choice Rock

# Player 2 submits Paper
linera wallet set-default <PLAYER_2_CHAIN_ID>
linera project run-operation submit-choice --room-id "room_0" --choice Paper
```

## Step 8: Query Game State

### Available Rooms
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { availableRooms { roomId player1 player2 roundNumber } }"
  }'
```

### Leaderboard
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { globalLeaderboard { chainId wins losses totalGames } }"
  }'
```

### Personal Stats
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { myStats { gamesPlayed gamesWon gamesLost winRate } }"
  }'
```

## Production Deployment

### Network Configuration
For production deployment on a real Linera network:

1. **Connect to Network**
   ```bash
   linera wallet init --with-new-chain --faucet <FAUCET_URL>
   ```

2. **Configure RPC Endpoint**
   ```bash
   export LINERA_RPC_ENDPOINT=<NETWORK_RPC_URL>
   ```

3. **Deploy Application**
   ```bash
   linera project publish-and-create
   ```

### Security Considerations

1. **Chain Selection**: Choose a reliable, well-funded chain as the leaderboard
2. **Access Control**: Ensure only authorized parties can reset the leaderboard
3. **Resource Management**: Monitor storage usage and clean up old games
4. **Network Fees**: Ensure sufficient balance for cross-chain messages

## Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clean and rebuild
cargo clean
cargo build --release --target wasm32-unknown-unknown
```

#### Network Connection Issues
```bash
# Check network status
linera net status

# Restart network if needed
linera net down
linera net up --testing-prng-seed 37
```

#### Application Not Found
```bash
# List applications
linera wallet list-applications

# Re-publish if needed
linera project publish-and-create
```

#### Chain Synchronization
```bash
# Sync chain state
linera sync

# Check chain info
linera wallet show
```

### Debug Mode

Enable debug logging for detailed information:
```bash
export RUST_LOG=debug
linera service --port 8080
```

### Log Analysis

Monitor contract logs for:
- `[SETUP]` - Configuration messages
- `[CREATE_ROOM]` - Room creation events
- `[MESSAGE]` - Cross-chain message processing
- `[LEADERBOARD]` - Statistics updates
- `[ERROR]` - Error conditions

## Performance Optimization

### Resource Management

1. **Room Cleanup**: Implement periodic cleanup of finished games
2. **Leaderboard Size**: Limit leaderboard to top 100 players
3. **Message Batching**: Consider batching multiple operations
4. **State Pruning**: Remove old game data periodically

### Scaling Considerations

1. **Multiple Leaderboards**: Consider regional leaderboards for large deployments
2. **Load Balancing**: Distribute room creation across multiple chains
3. **Caching**: Implement client-side caching for frequently accessed data
4. **Monitoring**: Set up monitoring for chain health and performance

## Maintenance

### Regular Tasks

1. **Monitor Chain Health**: Check chain synchronization and balance
2. **Update Statistics**: Verify leaderboard accuracy
3. **Clean Old Data**: Remove completed games periodically
4. **Backup State**: Export important game statistics

### Upgrade Process

1. **Test Upgrade**: Deploy to test network first
2. **Backup Data**: Export current leaderboard and statistics
3. **Deploy New Version**: Publish updated contract
4. **Migrate Data**: Transfer existing data if needed
5. **Verify Operation**: Test all functionality

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Linera documentation
3. Check contract logs for error messages
4. Verify network connectivity and chain synchronization

## Example Complete Session

```bash
# 1. Setup
linera net up --testing-prng-seed 37
linera wallet init --with-new-chain
cd rock-paper-scissors-cross-chain
cargo build --release --target wasm32-unknown-unknown

# 2. Deploy
linera project publish-and-create
# Note the APPLICATION_ID

# 3. Configure
linera project run-operation setup-leaderboard \
  --leaderboard-chain-id e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65

# 4. Start service
linera service --port 8080 &

# 5. Create and play
linera project run-operation create-room
linera project run-operation join-room --room-id "room_0"
# (Second player joins from different chain)
linera project run-operation submit-choice --room-id "room_0" --choice Rock
# (Second player submits choice)

# 6. Query results
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { globalLeaderboard { chainId wins losses } }"}'
```

This completes the deployment and basic usage of the Rock Paper Scissors cross-chain game!