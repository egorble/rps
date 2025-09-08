// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use std::sync::Arc;

use async_graphql::{ComplexObject, EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{linera_base_types::WithServiceAbi, views::View, Service, ServiceRuntime};
use rock_paper_scissors::{RockPaperScissorsAbi, GameRoom, LeaderboardEntry, Choice};

use self::state::{RockPaperScissorsState, PlayerStats};

linera_sdk::service!(RockPaperScissorsService);

pub struct RockPaperScissorsService {
    state: RockPaperScissorsState,
    runtime: Arc<ServiceRuntime<Self>>,
}

impl WithServiceAbi for RockPaperScissorsService {
    type Abi = RockPaperScissorsAbi;
}

impl Service for RockPaperScissorsService {
    type Parameters = ();

    async fn new(runtime: ServiceRuntime<Self>) -> Self {
        let state = RockPaperScissorsState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        RockPaperScissorsService {
            state,
            runtime: Arc::new(runtime),
        }
    }

    async fn handle_query(&self, request: Request) -> Response {
        // Collect available rooms
        let mut available_rooms = Vec::new();
        let available_room_ids = self.state.available_rooms.get().clone();
        for room_id in available_room_ids {
            if let Ok(Some(room)) = self.state.rooms.get(&room_id).await {
                if !room.is_full() && !room.game_result.is_finished {
                    available_rooms.push(room);
                }
            }
        }
        
        // Collect all rooms
        let mut all_rooms = Vec::new();
        if let Ok(room_ids) = self.state.rooms.indices().await {
            for room_id in room_ids {
                if let Ok(Some(room)) = self.state.rooms.get(&room_id).await {
                    all_rooms.push(room);
                }
            }
        }
        
        // Get leaderboard data
        let global_leaderboard = self.state.global_leaderboard.get().clone();
        
        // Get player stats
        let mut all_player_stats = Vec::new();
        if let Ok(player_chains) = self.state.player_stats.indices().await {
            for player_chain in player_chains {
                if let Ok(Some(stats)) = self.state.player_stats.get(&player_chain).await {
                    all_player_stats.push(stats);
                }
            }
        }
        
        // Get personal data
        let my_rooms = self.state.my_rooms.get().clone();
        let my_stats = self.state.my_stats.get().clone();
        let my_current_room = self.state.my_current_room.get().clone();
        let my_player_name = self.state.my_player_name.get().clone();
        
        // Get all player names
        let mut all_player_names = Vec::new();
        if let Ok(chain_ids) = self.state.player_names.indices().await {
            for chain_id in chain_ids {
                if let Ok(Some(name)) = self.state.player_names.get(&chain_id).await {
                    all_player_names.push(PlayerNameEntry {
                        chain_id: chain_id.to_string(),
                        name,
                    });
                }
            }
        }
        
        // Get configuration
        let is_leaderboard_chain = *self.state.is_leaderboard_chain.get();
        let leaderboard_chain_id = self.state.leaderboard_chain_id.get().clone();
        let room_counter = *self.state.room_counter.get();
        
        let schema = Schema::build(
            QueryRoot {
                available_rooms,
                all_rooms,
                global_leaderboard,
                all_player_stats,
                my_rooms,
                my_stats,
                my_current_room,
                is_leaderboard_chain,
                leaderboard_chain_id,
                room_counter,
                my_player_name,
                all_player_names,
            },
            MutationRoot {
                runtime: self.runtime.clone(),
            },
            EmptySubscription,
        )
        .finish();
        
        schema.execute(request).await
    }
}

struct QueryRoot {
    available_rooms: Vec<GameRoom>,
    all_rooms: Vec<GameRoom>,
    global_leaderboard: Vec<LeaderboardEntry>,
    all_player_stats: Vec<PlayerStats>,
    my_rooms: Vec<String>,
    my_stats: Option<PlayerStats>,
    my_current_room: Option<String>,
    is_leaderboard_chain: bool,
    leaderboard_chain_id: Option<linera_sdk::linera_base_types::ChainId>,
    room_counter: u64,
    my_player_name: Option<String>,
    all_player_names: Vec<PlayerNameEntry>,
}

#[Object]
impl QueryRoot {
    /// Get all available rooms (waiting for players)
    async fn available_rooms(&self) -> &Vec<GameRoom> {
        &self.available_rooms
    }
    
    /// Get all public rooms (waiting for players)
    async fn public_rooms(&self) -> Vec<&GameRoom> {
        self.available_rooms.iter().filter(|room| !room.private).collect()
    }
    
    /// Get all private rooms (waiting for players)
    async fn private_rooms(&self) -> Vec<&GameRoom> {
        self.available_rooms.iter().filter(|room| room.private).collect()
    }
    
    /// Get all rooms (including finished games)
    async fn all_rooms(&self) -> &Vec<GameRoom> {
        &self.all_rooms
    }
    
    /// Get a specific room by ID
    async fn room(&self, room_id: String) -> Option<&GameRoom> {
        self.all_rooms.iter().find(|room| room.room_id == room_id)
    }
    
    /// Get the global leaderboard
    async fn global_leaderboard(&self) -> &Vec<LeaderboardEntry> {
        &self.global_leaderboard
    }
    
    /// Get all player statistics
    async fn all_player_stats(&self) -> &Vec<PlayerStats> {
        &self.all_player_stats
    }
    
    /// Get player statistics for a specific chain
    async fn player_stats(&self, chain_id: String) -> Option<&PlayerStats> {
        // Parse chain_id string to ChainId if needed
        self.all_player_stats.iter().find(|stats| {
            format!("{:?}", stats.chain_id).contains(&chain_id)
        })
    }
    
    /// Get rooms this player is participating in
    async fn my_rooms(&self) -> &Vec<String> {
        &self.my_rooms
    }
    
    /// Get personal statistics
    async fn my_stats(&self) -> &Option<PlayerStats> {
        &self.my_stats
    }
    
    /// Get current active room
    async fn my_current_room(&self) -> &Option<String> {
        &self.my_current_room
    }
    
    /// Check if this chain is the leaderboard chain
    async fn is_leaderboard_chain(&self) -> bool {
        self.is_leaderboard_chain
    }
    
    /// Get the configured leaderboard chain ID
    async fn leaderboard_chain_id(&self) -> Option<String> {
        self.leaderboard_chain_id.map(|id| id.to_string())
    }
    
    /// Get the current room counter
    async fn room_counter(&self) -> u64 {
        self.room_counter
    }
    
    /// Get my player name
    async fn my_player_name(&self) -> &Option<String> {
        &self.my_player_name
    }
    
    /// Get all player names
    async fn all_player_names(&self) -> &Vec<PlayerNameEntry> {
        &self.all_player_names
    }
    
    /// Get player name by chain ID
    async fn player_name(&self, chain_id: String) -> Option<String> {
        self.all_player_names.iter()
            .find(|entry| entry.chain_id == chain_id)
            .map(|entry| entry.name.clone())
    }
    
    /// Get game statistics summary
    async fn game_stats(&self) -> GameStats {
        let total_rooms = self.all_rooms.len() as u64;
        let active_rooms = self.available_rooms.len() as u64;
        let finished_games = self.all_rooms.iter().filter(|room| room.game_result.is_finished).count() as u64;
        let total_players = self.all_player_stats.len() as u64;
        
        GameStats {
            total_rooms,
            active_rooms,
            finished_games,
            total_players,
        }
    }
}

#[derive(async_graphql::SimpleObject)]
struct GameStats {
    total_rooms: u64,
    active_rooms: u64,
    finished_games: u64,
    total_players: u64,
}

#[derive(async_graphql::SimpleObject)]
struct PlayerNameEntry {
    chain_id: String,
    name: String,
}

struct MutationRoot {
    runtime: Arc<ServiceRuntime<RockPaperScissorsService>>,
}

#[Object]
impl MutationRoot {
    /// Setup the leaderboard chain (admin operation)
    async fn setup_leaderboard(&self, leaderboard_chain_id: String) -> String {
        // Parse chain ID string
        let chain_id = match leaderboard_chain_id.parse() {
            Ok(id) => id,
            Err(_) => return format!("Invalid chain ID format: {}", leaderboard_chain_id),
        };
        
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::SetupLeaderboard { leaderboard_chain_id: chain_id });
        format!("Setup leaderboard with chain ID: {}", leaderboard_chain_id)
    }
    
    /// Create a new room (only on leaderboard chain)
    async fn create_room(&self, room_id: String, private: bool) -> String {
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::CreateRoom { room_id: room_id.clone(), private });
        format!("New {} game room '{}' created successfully", if private { "private" } else { "public" }, room_id)
    }
    
    /// Join an existing room
    async fn join_room(&self, room_id: String) -> String {
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::JoinRoom { room_id: room_id.clone() });
        format!("Joined room: {}", room_id)
    }
    
    /// Submit a choice for the current round
    async fn submit_choice(&self, room_id: String, choice: Choice) -> String {
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::SubmitChoice { room_id: room_id.clone(), choice });
        format!("Submitted choice {:?} for room: {}", choice, room_id)
    }
    
    /// Reset the leaderboard (admin operation, only on leaderboard chain)
    async fn reset_leaderboard(&self) -> String {
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::ResetLeaderboard);
        "Leaderboard reset successfully".to_string()
    }
    
    /// Set player name
    async fn set_player_name(&self, name: String) -> String {
        self.runtime.schedule_operation(&rock_paper_scissors::Operation::SetPlayerName { name: name.clone() });
        format!("Player name set to '{}' successfully", name)
    }
}

#[ComplexObject]
impl RockPaperScissorsState {}

#[ComplexObject]
impl PlayerStats {
    /// Get win rate as a formatted percentage string
    async fn win_rate_formatted(&self) -> String {
        format!("{:.1}%", self.win_rate())
    }
    
    /// Get current streak description
    async fn streak_description(&self) -> String {
        if self.current_streak == 0 {
            "No current streak".to_string()
        } else {
            format!("{} game win streak", self.current_streak)
        }
    }
    
    /// Get player rank based on wins (would need global context in real implementation)
    async fn estimated_rank(&self) -> String {
        if self.games_won >= 100 {
            "Master".to_string()
        } else if self.games_won >= 50 {
            "Expert".to_string()
        } else if self.games_won >= 20 {
            "Advanced".to_string()
        } else if self.games_won >= 5 {
            "Intermediate".to_string()
        } else {
            "Beginner".to_string()
        }
    }
}