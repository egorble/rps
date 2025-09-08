// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use linera_sdk::views::{linera_views, MapView, RegisterView, RootView, ViewStorageContext};
use linera_sdk::linera_base_types::ChainId;
use serde::{Deserialize, Serialize};
use async_graphql::SimpleObject;
use rock_paper_scissors::{GameRoom, LeaderboardEntry};

/// Player statistics for tracking personal game history
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PlayerStats {
    pub chain_id: ChainId,
    pub games_played: u64,
    pub games_won: u64,
    pub games_lost: u64,
    pub current_streak: u64,
    pub best_streak: u64,
    pub last_game_timestamp: u64,
}

impl PlayerStats {
    #[allow(dead_code)]
    pub fn new(chain_id: ChainId) -> Self {
        Self {
            chain_id,
            games_played: 0,
            games_won: 0,
            games_lost: 0,
            current_streak: 0,
            best_streak: 0,
            last_game_timestamp: 0,
        }
    }
    
    #[allow(dead_code)]
    pub fn add_game(&mut self, won: bool, timestamp: u64) {
        self.games_played += 1;
        self.last_game_timestamp = timestamp;
        
        if won {
            self.games_won += 1;
            self.current_streak += 1;
            if self.current_streak > self.best_streak {
                self.best_streak = self.current_streak;
            }
        } else {
            self.games_lost += 1;
            self.current_streak = 0;
        }
    }
    
    pub fn win_rate(&self) -> f64 {
        if self.games_played > 0 {
            (self.games_won as f64) / (self.games_played as f64) * 100.0
        } else {
            0.0
        }
    }
}

/// The application state for Rock Paper Scissors
#[derive(RootView)]
#[view(context = ViewStorageContext)]
pub struct RockPaperScissorsState {
    // Game state
    pub rooms: MapView<String, GameRoom>, // room_id -> GameRoom
    pub room_counter: RegisterView<u64>, // Counter for generating unique room IDs
    pub available_rooms: RegisterView<Vec<String>>, // List of rooms waiting for players
    
    // Player names
    pub player_names: MapView<ChainId, String>, // chain_id -> player_name
    pub my_player_name: RegisterView<Option<String>>, // This player's name
    
    // Leaderboard state (only on leaderboard chain)
    pub global_leaderboard: RegisterView<Vec<LeaderboardEntry>>, // Top players globally
    pub player_stats: MapView<ChainId, PlayerStats>, // chain_id -> detailed stats
    pub is_leaderboard_chain: RegisterView<bool>, // Flag to identify if this is the leaderboard chain
    pub leaderboard_chain_id: RegisterView<Option<ChainId>>, // Store the leaderboard chain ID
    
    // Player-specific state (on each player's chain)
    pub my_rooms: RegisterView<Vec<String>>, // Rooms this player is participating in
    pub my_stats: RegisterView<Option<PlayerStats>>, // Personal statistics
    pub my_current_room: RegisterView<Option<String>>, // Currently active room
}