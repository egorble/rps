# Linera Blockchain Event Listener

This project provides an efficient way to listen for new blocks on the Linera blockchain and automatically query your GraphQL endpoint when blockchain events occur - no more constant polling!

## 🎯 **Event-Driven Approach**

Instead of continuously polling the GraphQL endpoint, this client:
1. **Connects to the Linera blockchain** using the official Linera Web client
2. **Listens for new block events** via blockchain notifications
3. **Automatically queries GraphQL** only when new blocks are detected
4. **Provides real-time updates** with minimal resource usage

## 🌐 Browser-based Client

Simply open [`index.html`](file://c:	estfrontindex.html) in your web browser:

1. Click **"🚀 Initialize Linera"** to connect to the blockchain
2. Select **"Event-driven"** mode (recommended)
3. Click **"👂 Start Listening"** to begin monitoring
4. Watch automatic updates when new blocks are produced!

## ⚡ **Key Features**

### **Event-Driven Mode (Recommended)**
- Connects to Linera testnet faucet
- Creates wallet and claims chain automatically  
- Listens for `NewBlock` notifications
- Queries GraphQL only when blockchain state changes
- **Much more efficient** than constant polling

### **Polling Fallback**
- Traditional interval-based querying (1-10 seconds)
- Backup option if event listening fails
- Still uses Linera client for GraphQL queries

## 📋 **Pre-configured Settings**

- **Application ID**: `dfe2a342d5003570740d71be2541021950060ffe8a5e1ae53e96b58cd2d2ae5d`
- **Chain ID**: `47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021`
- **Faucet**: `https://faucet.testnet-conway.linera.net`
- **GraphQL Query**:
  ```graphql
  query{
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
  }
  ```

## 🔧 **How It Works**

1. **Initialization**: Connects to Linera testnet, creates wallet, gets application backend
2. **Event Listening**: Uses `client.onNotification()` to listen for blockchain events
3. **Smart Querying**: Only queries GraphQL when `notification.reason.NewBlock` is detected
4. **Real-time Updates**: Immediate response to blockchain state changes

## 📊 **What You'll See**

- Real-time blockchain connection status
- New block notifications with block counter
- Automatic GraphQL queries triggered by blockchain events
- Game room data (players, choices, results) updated on blockchain changes
- Efficient resource usage (no unnecessary polling)

## 🚀 **Quick Start**

1. Open [`index.html`](file://c:	estfrontindex.html) in your browser
2. Click **"Initialize Linera"** 
3. Wait for successful connection to blockchain
4. Click **"Start Listening"** 
5. Watch for new block events and automatic data updates!

This approach is much more efficient and responsive than traditional polling, as it leverages the Linera blockchain's native notification system.