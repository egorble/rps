# Rock Paper Scissors Cross-Chain Game

A cross-chain Rock Paper Scissors game built on Linera blockchain (v0.15.0) with centralized leaderboard and distributed gameplay.

## Overview

This smart contract implements a Rock Paper Scissors game where:
- **Leaderboard Chain**: The only chain allowed to create game rooms and manage the global leaderboard
- **Player Chains**: Can join existing rooms and submit moves via cross-chain messages
- **Best of 5**: Each game consists of up to 5 rounds, first to win 3 rounds wins the game
- **Global Statistics**: All game results are tracked on the leaderboard chain

## Features

- **Round History**: Complete history of all completed rounds with player choices and results
- **Draw Tracking**: Proper tracking and display of draw rounds in game statistics
- **Choice Reset**: Player choices are cleared after each round but preserved in history
- **Real-time Game State**: Current round choices and historical data available via GraphQL
- **Cross-chain Communication**: Seamless gameplay across different blockchain chains
- **Private/Public Rooms**: Support for both private and public game rooms
- **Leaderboard Privacy**: Only results from public rooms are recorded in the global leaderboard

## Architecture

### Core Components

1. **Game Rooms**: Created only on the leaderboard chain, store game state
2. **Cross-Chain Messages**: Enable communication between player chains and leaderboard
3. **Leaderboard System**: Tracks wins, losses, and statistics for all players
4. **Player Statistics**: Personal game history and performance metrics

### Data Structures

```rust
// Game choices
enum Choice {
    Rock,
    Paper,
    Scissors,
}

// Game room structure
struct GameRoom {
    id: String,
    player1: Option<ChainId>,
    player2: Option<ChainId>,
    player1_name: Option<String>, // Player 1's display name
    player2_name: Option<String>, // Player 2's display name
    player1_choice: Option<Choice>,
    player2_choice: Option<Choice>,
    game_result: GameResult,
    created_at: u64,
    round_number: u8,
    private: bool,
    round_history: Vec<RoundHistory>, // History of completed rounds
}

// Round history entry
struct RoundHistory {
    round_number: u8,
    player1_choice: Choice,
    player2_choice: Choice,
    result: RoundResult,
    winner: Option<ChainId>,
}

// Game result with draws tracking
struct GameResult {
    player1_wins: u8,
    player2_wins: u8,
    draws: u8, // Number of draw rounds
    winner: Option<ChainId>,
    is_finished: bool,
}

// Leaderboard entry
struct LeaderboardEntry {
    chain_id: ChainId,
    wins: u64,
    losses: u64,
    total_games: u64,
    player_name: Option<String>, // Player's display name
}
```

## Operations

### Setup Operations

#### SetupLeaderboard
Configures which chain serves as the leaderboard chain.
```rust
Operation::SetupLeaderboard {
    leaderboard_chain_id: ChainId,
}
```

#### SetPlayerName
Sets the display name for the current player.
```rust
Operation::SetPlayerName {
    name: String,
}
```

### Game Operations

#### CreateRoom (Leaderboard Chain Only)
Creates a new game room waiting for players.
```rust
Operation::CreateRoom
```

#### JoinRoom (Any Chain)
Joins an existing game room.
```rust
Operation::JoinRoom {
    room_id: String,
}
```

#### SubmitChoice (Any Chain)
Submits a move for the current round.
```rust
Operation::SubmitChoice {
    room_id: String,
    choice: Choice,
}
```

### Query Operations

#### GetAvailableRooms
Returns rooms waiting for players.

#### GetRoom
Returns details of a specific room.
```rust
Operation::GetRoom {
    room_id: String,
}
```

#### GetLeaderboard
Returns the global leaderboard.

#### GetMyStats
Returns personal game statistics.

### Admin Operations

#### ResetLeaderboard (Leaderboard Chain Only)
Resets all game data and statistics.
```rust
Operation::ResetLeaderboard
```

## Cross-Chain Messages

### JoinRoom Message
Sent from player chain to leaderboard chain to join a room.
```rust
GameMessage::JoinRoom {
    room_id: String,
    player_chain: ChainId,
}
```

### PlayerJoined Message
Confirmation sent back to player chain.
```rust
GameMessage::PlayerJoined {
    room_id: String,
    player_chain: ChainId,
    success: bool,
}
```

### SubmitChoice Message
Sent from player chain to leaderboard chain with move.
```rust
GameMessage::SubmitChoice {
    room_id: String,
    player_chain: ChainId,
    choice: Choice,
}
```

### RoundCompleted Message
Sent to both players after each round.
```rust
GameMessage::RoundCompleted {
    room_id: String,
    player1_choice: Choice,
    player2_choice: Choice,
    round_winner: Option<ChainId>,
    round_result: RoundResult,
    game_result: GameResult,
}
```

### GameFinished Message
Sent when a player reaches 2 wins.
```rust
GameMessage::GameFinished {
    room_id: String,
    winner: ChainId,
    final_result: GameResult,
}
```

## Game Flow

### 1. Setup Phase
```bash
# On the designated leaderboard chain
linera project run-operation setup-leaderboard --leaderboard-chain-id <CHAIN_ID>

# Optional: Set your player name
linera project run-operation set-player-name --name "YourPlayerName"
```

### 2. Room Creation
```bash
# Only on leaderboard chain
linera project run-operation create-room
```

### 3. Joining a Game
```bash
# On any player chain
linera project run-operation join-room --room-id "room_0"
```

### 4. Playing Rounds
```bash
# Each player submits their choice
linera project run-operation submit-choice --room-id "room_0" --choice Rock
linera project run-operation submit-choice --room-id "room_0" --choice Paper
```

### 5. Game Completion
- When both players submit choices, the round is calculated
- Results are sent to both players
- Game continues until one player wins 2 rounds
- Statistics are updated on the leaderboard chain

## GraphQL Queries

### Available Rooms
```graphql
query {
  availableRooms {
    roomId
    player1
    player2
    createdAt
    roundNumber
  }
}
```

### Global Leaderboard
```graphql
query {
  globalLeaderboard {
    chainId
    wins
    losses
    totalGames
    winRate
    playerName
  }
}
```

### Personal Statistics
```graphql
query {
  myStats {
    chainId
    gamesPlayed
    gamesWon
    gamesLost
    currentStreak
    bestStreak
    winRate
  }
}
```

### Game Statistics
```graphql
query {
  gameStats {
    totalRooms
    activeRooms
    finishedGames
    totalPlayers
  }
}
```

### Player Names
```graphql
query {
  # Get my player name
  myPlayerName
  
  # Get all player names
  allPlayerNames {
    chainId
    name
  }
  
  # Get specific player name by chain ID
  playerName(chainId: "chain_id_here")
}
```

### Mutations
```graphql
mutation {
  # Set player name
  setPlayerName(name: "YourName")
  
  # Other mutations
  setupLeaderboard(leaderboardChainId: "chain_id")
  createRoom(roomId: "room_1", private: false)
  joinRoom(roomId: "room_1")
  submitChoice(roomId: "room_1", choice: ROCK)
}
```

## Building and Deployment

### Prerequisites
- Rust 1.75+
- Linera SDK 0.15.0
- linera-sdk dependencies

### Build
```bash
cargo build --release --target wasm32-unknown-unknown
```

### Deploy
```bash
# Publish the application
linera project publish-and-create

# Setup leaderboard chain (run on designated leaderboard chain)
linera project run-operation setup-leaderboard --leaderboard-chain-id <LEADERBOARD_CHAIN_ID>
```

## Security Considerations

1. **Leaderboard Authority**: Only the designated leaderboard chain can create rooms and manage global state
2. **Player Validation**: Players can only join rooms they're not already in
3. **Move Validation**: Players can only submit moves for rooms they're participating in
4. **Game Integrity**: Round results are calculated deterministically on the leaderboard chain
5. **Statistics Integrity**: All statistics are managed centrally to prevent manipulation
6. **Leaderboard Privacy**: Private rooms do not affect global leaderboard to maintain player privacy

## Error Handling

- **Room Not Found**: Graceful handling when trying to join non-existent rooms
- **Room Full**: Prevents joining rooms that already have 2 players
- **Invalid Moves**: Rejects moves from players not in the specified room
- **Bouncing Messages**: Proper handling of failed cross-chain messages
- **Configuration Errors**: Clear error messages for setup issues

## Best Practices

1. **Setup First**: Always configure the leaderboard chain before creating rooms
2. **Room Management**: Create rooms only on the leaderboard chain
3. **Cross-Chain Communication**: Handle message failures gracefully
4. **State Consistency**: Let the leaderboard chain be the source of truth
5. **Resource Management**: Clean up finished games to prevent state bloat

## Example Usage

### Complete Game Session
```bash
# 1. Setup (on leaderboard chain)
linera project run-operation setup-leaderboard --leaderboard-chain-id e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65

# 2. Create room (on leaderboard chain)
linera project run-operation create-room

# 3. Player 1 joins (on player 1 chain)
linera project run-operation join-room --room-id "room_0"

# 4. Player 2 joins (on player 2 chain)
linera project run-operation join-room --room-id "room_0"

# 5. Round 1 - Player 1 plays Rock
linera project run-operation submit-choice --room-id "room_0" --choice Rock

# 6. Round 1 - Player 2 plays Paper
linera project run-operation submit-choice --room-id "room_0" --choice Paper
# Result: Player 2 wins round 1

# 7. Round 2 - Player 1 plays Scissors
linera project run-operation submit-choice --room-id "room_0" --choice Scissors

# 8. Round 2 - Player 2 plays Rock
linera project run-operation submit-choice --room-id "room_0" --choice Rock
# Result: Player 2 wins round 2 (2-0)

# 9. Round 3 - Player 1 plays Paper
linera project run-operation submit-choice --room-id "room_0" --choice Paper

# 10. Round 3 - Player 2 plays Scissors
linera project run-operation submit-choice --room-id "room_0" --choice Scissors
# Result: Player 2 wins round 3 and the game (3-0)
```

## GraphQL Queries

### Get Room with History and Draws

```graphql
query GetRoomDetails($roomId: String!) {
  room(roomId: $roomId) {
    roomId
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
    roundNumber
    private
    roundHistory {
      roundNumber
      player1Choice
      player2Choice
      result
      winner
    }
  }
}
```

### Get All Rooms with Complete Information

```graphql
query GetAllRooms {
  allRooms {
    roomId
    gameResult {
      player1Wins
      player2Wins
      draws
      isFinished
    }
    roundHistory {
      roundNumber
      player1Choice
      player2Choice
      result
    }
  }
}
```

### Example Response with Round History

```json
{
  "room": {
    "roomId": "room_0",
    "player1": "chain_1",
    "player2": "chain_2",
    "player1Choice": null,
    "player2Choice": null,
    "gameResult": {
      "player1Wins": 1,
      "player2Wins": 2,
      "draws": 1,
      "winner": null,
      "isFinished": false
    },
    "roundNumber": 5,
    "roundHistory": [
      {
        "roundNumber": 1,
        "player1Choice": "Rock",
        "player2Choice": "Paper",
        "result": "Lose",
        "winner": "chain_2"
      },
      {
        "roundNumber": 2,
        "player1Choice": "Paper",
        "player2Choice": "Paper",
        "result": "Draw",
        "winner": null
      },
      {
        "roundNumber": 3,
        "player1Choice": "Scissors",
        "player2Choice": "Rock",
        "result": "Lose",
        "winner": "chain_2"
      },
      {
        "roundNumber": 4,
        "player1Choice": "Rock",
        "player2Choice": "Scissors",
        "result": "Win",
        "winner": "chain_1"
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

1. **"Leaderboard not configured"**
   - Run `SetupLeaderboard` operation first
   - Ensure you're using the correct chain ID

2. **"Rooms can only be created on leaderboard chain"**
   - Switch to the designated leaderboard chain
   - Verify the chain is properly configured

3. **"Room not found"**
   - Check if the room ID exists
   - Ensure the room hasn't been cleaned up after completion

4. **"Cannot join room"**
   - Room might be full (2 players max)
   - You might already be in the room
   - Game might be finished

### Debug Information

The contract includes extensive logging. Check the console output for:
- `[SETUP]` - Configuration messages
- `[CREATE_ROOM]` - Room creation
- `[JOIN_ROOM]` - Join requests
- `[MESSAGE]` - Cross-chain message processing
- `[LEADERBOARD]` - Statistics updates

## License

Copyright (c) Zefchain Labs, Inc.
SPDX-License-Identifier: Apache-2.0