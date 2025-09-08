# Linera Rock Paper Scissors - Integration Guide

## Overview
This implementation replaces the Socket.IO backend with Linera blockchain GraphQL queries for a fully decentralized Rock Paper Scissors game.

## Key Changes Made

### 1. **New Core Files**
- `LineraGameClient.js` - Main Linera GraphQL client
- `LineraContext.js` - React context replacing SocketContext
- Updated components with Linera integration

### 2. **Constants Used (as specified)**
```javascript
BASE_URL = "http://localhost:8080"
APP_ID = "46dfe0d1a83e96587e1a60197adcefe6958a41a6916de0ed0043e4621a77bb50"
READ_CHAIN_ID = "47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021"
```

### 3. **Game Flow Implementation**

#### **Player Initialization**
- Automatically calls `openChain(chainId, owner, balance)` on game start
- Uses demo chain ID and owner (can be replaced with wallet integration)

#### **Play with Friend (Private Room)**
- Generates UUID for roomId
- Calls `createRoom(private: true, roomId: "generated")`
- Shows waiting screen with room ID to share

#### **Play with Strangers (Public Room)**
- Queries `availableRooms { roomId }` from READ_CHAIN
- Tries to join existing rooms with retry logic
- Creates new public room if no rooms available
- Auto-joins created room

#### **Choice Submission**
- Calls `submitChoice(roomId, choice)` on player's chain
- Choices: "ROCK", "PAPER", "SCISSORS"
- UI updates via polling READ_CHAIN

#### **Game State Updates**
- Polls `room(roomId)` query on READ_CHAIN every 2 seconds
- Handles first-to-3 win condition
- Shows game progress with star indicators

### 4. **Error Handling & Concurrency**
- Retry logic for failed join attempts
- GraphQL error handling with user feedback
- Exponential backoff for network requests
- Graceful fallback for initialization failures

### 5. **Visual Components (Unchanged)**
- All original styling and animations preserved
- Same UI/UX experience as Socket.IO version
- Compatible with existing CSS modules

## Integration Steps

### Step 1: Copy Files to Your React Project
```bash
# Copy these files to your React app:
src/
  ├── LineraGameClient.js
  ├── context/
  │   └── LineraContext.js
  ├── components/
  │   ├── Button/index.jsx
  │   └── Controls/index.jsx
  ├── pages/
  │   ├── Home/index.jsx
  │   ├── Room/index.jsx
  │   └── Result/index.jsx
  └── App.js
```

### Step 2: Update Your App.js
Replace SocketContextProvider with LineraContextProvider:
```jsx
import { LineraContextProvider } from "./context/LineraContext";
// ... rest of your App.js
```

### Step 3: Update Component Imports
Change any imports from:
```jsx
import { SocketContext } from "../../context/SocketContext";
```
To:
```jsx
import { LineraContext } from "../../context/LineraContext";
```

### Step 4: Configure Linera Node
Ensure your Linera node is running on localhost:8080 with the specified APP_ID and chains.

## GraphQL Schema Expected

The implementation expects these GraphQL operations:

### Mutations
```graphql
# On base node endpoint
mutation OpenChain($chainId: String!, $owner: String!, $balance: Int!) {
  openChain(chainId: $chainId, owner: $owner, balance: $balance)
}

# On READ_CHAIN endpoint
mutation CreateRoom($private: Boolean!, $roomId: String!) {
  createRoom(private: $private, roomId: $roomId) {
    roomId
    private
    player1
    player2
  }
}

# On player's chain endpoint
mutation JoinRoom($roomId: String!) {
  joinRoom(roomId: $roomId) {
    roomId
    player1
    player2
  }
}

mutation SubmitChoice($roomId: String!, $choice: Choice!) {
  submitChoice(roomId: $roomId, choice: $choice) {
    success
  }
}
```

### Queries
```graphql
# On READ_CHAIN endpoint
query AvailableRooms {
  availableRooms {
    roomId
  }
}

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
```

## Testing
1. Start your Linera node on localhost:8080
2. Deploy your Rock Paper Scissors contract
3. Start the React app
4. The app will auto-initialize the player chain
5. Test private rooms (share room ID)
6. Test public room matchmaking
7. Play games and verify blockchain state updates

## Notes
- Polling interval: 2 seconds for room state updates
- Retry attempts: 3 with exponential backoff
- Game ends at 3 wins (first-to-3)
- Room IDs are generated client-side using crypto.randomUUID()
- All blockchain interactions use proper error handling with user feedback