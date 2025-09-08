// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

#![cfg_attr(target_arch = "wasm32", no_main)]

mod state;

use rock_paper_scissors::{ApplicationParameters, GameMessage, Operation, RockPaperScissorsAbi, 
    GameRoom, LeaderboardEntry, Choice};
use linera_sdk::{
    linera_base_types::{ChainId, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};
use async_graphql::ComplexObject;

use self::state::{RockPaperScissorsState, PlayerStats};

linera_sdk::contract!(RockPaperScissorsContract);

pub struct RockPaperScissorsContract {
    state: RockPaperScissorsState,
    runtime: ContractRuntime<Self>,
}

impl WithContractAbi for RockPaperScissorsContract {
    type Abi = RockPaperScissorsAbi;
}

impl Contract for RockPaperScissorsContract {
    type Message = GameMessage;
    type InstantiationArgument = ();
    type Parameters = ApplicationParameters;
    type EventValue = ();

    async fn load(runtime: ContractRuntime<Self>) -> Self {
        let state = RockPaperScissorsState::load(runtime.root_view_storage_context())
            .await
            .expect("Failed to load state");
        RockPaperScissorsContract { state, runtime }
    }

    async fn instantiate(&mut self, _argument: ()) {
        // Validate that the application parameters were configured correctly.
        let parameters = self.runtime.application_parameters();
        
        // Initialize game state
        self.state.room_counter.set(0);
        self.state.available_rooms.set(Vec::new());
        
        // Initialize leaderboard state
        self.state.global_leaderboard.set(Vec::new());
        self.state.leaderboard_chain_id.set(parameters.leaderboard_chain_id);
        
        // Check if this chain is the leaderboard chain
        let is_leaderboard = parameters.leaderboard_chain_id
            .map(|chain_id| chain_id == self.runtime.chain_id())
            .unwrap_or(false);
        self.state.is_leaderboard_chain.set(is_leaderboard);
        
        // Initialize player-specific state
        self.state.my_rooms.set(Vec::new());
        self.state.my_stats.set(None);
        self.state.my_current_room.set(None);
        
        eprintln!("[INIT] Rock Paper Scissors contract initialized on chain {:?}", self.runtime.chain_id());
        eprintln!("[INIT] Is leaderboard chain: {}", is_leaderboard);
        eprintln!("[INIT] Configured leaderboard chain: {:?}", parameters.leaderboard_chain_id);
    }

    async fn execute_operation(&mut self, operation: Operation) -> () {
        match operation {
            Operation::SetupLeaderboard { leaderboard_chain_id } => {
                eprintln!("[SETUP] SetupLeaderboard called on chain {:?} with leaderboard_chain_id: {:?}", 
                    self.runtime.chain_id(), leaderboard_chain_id);
                
                // Only allow setup if not already configured
                if self.state.leaderboard_chain_id.get().is_some() {
                    panic!("Leaderboard already configured");
                }

                // Set the leaderboard chain ID
                self.state.leaderboard_chain_id.set(Some(leaderboard_chain_id));

                // If this chain is being designated as the leaderboard chain
                if self.runtime.chain_id() == leaderboard_chain_id {
                    self.state.is_leaderboard_chain.set(true);
                    eprintln!("[SETUP] This chain IS the leaderboard chain");
                } else {
                    eprintln!("[SETUP] This chain is NOT the leaderboard chain");
                }
            }
            
            Operation::SetPlayerName { name } => {
                let current_chain = self.runtime.chain_id();
                eprintln!("[SET_NAME] Setting player name '{}' for chain {:?}", name, current_chain);
                
                // Set the player name locally
                self.state.my_player_name.set(Some(name.clone()));
                
                // Send name update to leaderboard chain if this is not the leaderboard chain
                if let Some(leaderboard_chain_id) = *self.state.leaderboard_chain_id.get() {
                    if current_chain != leaderboard_chain_id {
                        let message = GameMessage::UpdatePlayerName {
                            player_chain: current_chain,
                            player_name: name,
                        };
                        self.runtime.send_message(leaderboard_chain_id, message);
                    } else {
                        // If this is the leaderboard chain, update the name mapping directly
                        let _ = self.state.player_names.insert(&current_chain, name);
                    }
                }
            }
            
            Operation::CreateRoom { room_id, private } => {
                let current_chain = self.runtime.chain_id();
                eprintln!("[CREATE_ROOM] CreateRoom called on chain {:?} with room_id: '{}', private: {}", current_chain, room_id, private);
                
                // Only allow room creation on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    panic!("Rooms can only be created on the leaderboard chain");
                }
                
                // Check if room with this ID already exists
                if let Ok(Some(_)) = self.state.rooms.get(&room_id).await {
                    panic!("Room with ID '{}' already exists", room_id);
                }
                
                let timestamp = self.runtime.system_time().micros();
                let room = GameRoom::new(room_id.clone(), timestamp, private);
                
                let _ = self.state.rooms.insert(&room_id, room);
                
                // Add to available rooms list (only if not private)
                if !private {
                    let mut available_rooms = self.state.available_rooms.get().clone();
                    available_rooms.push(room_id.clone());
                    self.state.available_rooms.set(available_rooms);
                }
                
                eprintln!("[CREATE_ROOM] Created room {} on leaderboard chain", room_id);
            }
            
            Operation::JoinRoom { room_id } => {
                let current_chain = self.runtime.chain_id();
                let leaderboard_chain = self.state.leaderboard_chain_id.get().clone();
                let player_name = self.state.my_player_name.get().clone();
                
                match leaderboard_chain {
                    Some(leader_chain) => {
                        // Send JoinRoom message to leaderboard chain
                        let message = GameMessage::JoinRoom {
                            room_id: room_id.clone(),
                            player_chain: current_chain,
                            player_name: player_name.clone(),
                        };
                        self.runtime.send_message(leader_chain, message);
                        eprintln!("[JOIN_ROOM] Sent JoinRoom request to leaderboard chain {:?} with name {:?}", leader_chain, player_name);
                    }
                    None => {
                        eprintln!("[ERROR] No leaderboard chain configured for joining room. Please use SetupLeaderboard operation first");
                    }
                }
            }
            
            Operation::SubmitChoice { room_id, choice } => {
                let current_chain = self.runtime.chain_id();
                let leaderboard_chain = self.state.leaderboard_chain_id.get().clone();
                
                match leaderboard_chain {
                    Some(leader_chain) => {
                        // Send SubmitChoice message to leaderboard chain
                        let message = GameMessage::SubmitChoice {
                            room_id: room_id.clone(),
                            player_chain: current_chain,
                            choice,
                        };
                        self.runtime.send_message(leader_chain, message);
                        eprintln!("[SUBMIT_CHOICE] Sent choice {:?} to leaderboard chain {:?}", choice, leader_chain);
                    }
                    None => {
                        eprintln!("[ERROR] No leaderboard chain configured for submitting choice. Please use SetupLeaderboard operation first");
                    }
                }
            }
            
            Operation::GetAvailableRooms => {
                // This operation doesn't modify state, just allows querying available rooms
                // The actual rooms can be queried through the service
            }
            
            Operation::GetRoom { room_id: _ } => {
                // This operation doesn't modify state, just allows querying specific room
                // The actual room can be queried through the service
            }
            
            Operation::GetLeaderboard => {
                // This operation doesn't modify state, just allows querying leaderboard
                // The actual leaderboard can be queried through the service
            }
            
            Operation::GetMyStats => {
                // This operation doesn't modify state, just allows querying personal stats
                // The actual stats can be queried through the service
            }
            
            Operation::ResetLeaderboard => {
                eprintln!("[RESET] ResetLeaderboard called on chain {:?}", self.runtime.chain_id());
                
                // Only allow reset on the leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    panic!("Reset operation can only be performed on the leaderboard chain");
                }
                
                // Clear all game data
                self.state.rooms.clear();
                self.state.available_rooms.set(Vec::new());
                self.state.global_leaderboard.set(Vec::new());
                self.state.player_stats.clear();
                self.state.room_counter.set(0);
                
                eprintln!("[RESET] Leaderboard and all game data reset completed successfully");
            }
        }
    }

    async fn execute_message(&mut self, message: Self::Message) {
        eprintln!("[MESSAGE] Received message on chain {:?}", self.runtime.chain_id());
        
        // Check if message is bouncing
        let is_bouncing = self
            .runtime
            .message_is_bouncing()
            .expect("Message delivery status must be available when executing a message");

        if is_bouncing {
            eprintln!("[MESSAGE] Message is bouncing, returning");
            return;
        }

        match message {
            GameMessage::JoinRoom { room_id, player_chain, player_name } => {
                eprintln!("[MESSAGE] Processing JoinRoom: {} from {:?} with name {:?}", room_id, player_chain, player_name);
                
                // Only process on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[MESSAGE] This is NOT the leaderboard chain, ignoring JoinRoom message");
                    return;
                }
                
                // Store player name if provided
                if let Some(ref name) = player_name {
                    let _ = self.state.player_names.insert(&player_chain, name.clone());
                }
                
                let mut success = false;
                
                if let Ok(Some(mut room)) = self.state.rooms.get(&room_id).await {
                    if room.can_join(player_chain) {
                        if room.add_player(player_chain) {
                            // Set player name in room
                            if let Some(ref name) = player_name {
                                if room.player1 == Some(player_chain) {
                                    room.player1_name = Some(name.clone());
                                } else if room.player2 == Some(player_chain) {
                                    room.player2_name = Some(name.clone());
                                }
                            }
                            
                            let _ = self.state.rooms.insert(&room_id, room.clone());
                            success = true;
                            
                            // Remove from available rooms if now full
                            if room.is_full() {
                                let mut available_rooms = self.state.available_rooms.get().clone();
                                available_rooms.retain(|id| id != &room_id);
                                self.state.available_rooms.set(available_rooms);
                            }
                            
                            eprintln!("[MESSAGE] Player {:?} ({:?}) joined room {} successfully", player_chain, player_name, room_id);
                        }
                    } else {
                        eprintln!("[MESSAGE] Player {:?} cannot join room {} - room full or already joined", player_chain, room_id);
                    }
                } else {
                    eprintln!("[MESSAGE] Room {} not found for join request", room_id);
                }
                
                // Send confirmation back to player
                let response_message = GameMessage::PlayerJoined {
                    room_id: room_id.clone(),
                    player_chain,
                    success,
                };
                self.runtime.send_message(player_chain, response_message);
            }
            
            GameMessage::PlayerJoined { room_id, player_chain, success } => {
                eprintln!("[MESSAGE] Processing PlayerJoined: {} for {:?}, success: {}", room_id, player_chain, success);
                
                let current_chain = self.runtime.chain_id();
                if current_chain == player_chain {
                    if success {
                        // Add room to player's room list
                        let mut my_rooms = self.state.my_rooms.get().clone();
                        if !my_rooms.contains(&room_id) {
                            my_rooms.push(room_id.clone());
                            self.state.my_rooms.set(my_rooms);
                        }
                        
                        // Set as current room
                        self.state.my_current_room.set(Some(room_id.clone()));
                        
                        eprintln!("[MESSAGE] Successfully joined room {}", room_id);
                    } else {
                        eprintln!("[MESSAGE] Failed to join room {}", room_id);
                    }
                }
            }
            
            GameMessage::SubmitChoice { room_id, player_chain, choice } => {
                eprintln!("[MESSAGE] Processing SubmitChoice: {} from {:?} with choice {:?}", room_id, player_chain, choice);
                
                // Only process on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[MESSAGE] This is NOT the leaderboard chain, ignoring SubmitChoice message");
                    return;
                }
                
                if let Ok(Some(mut room)) = self.state.rooms.get(&room_id).await {
                    if room.set_choice(player_chain, choice) {
                        eprintln!("[MESSAGE] Choice {:?} set for player {:?} in room {}", choice, player_chain, room_id);
                        
                        // Check if both players have chosen
                        if room.both_players_chose() {
                            eprintln!("[MESSAGE] Both players have chosen, calculating round result");
                            
                            if let Some((round_result, round_winner)) = room.calculate_round_result() {
                                let player1_choice = room.player1_choice.unwrap_or(Choice::Rock); // Should not happen
                                let player2_choice = room.player2_choice.unwrap_or(Choice::Rock); // Should not happen
                                
                                // Send round completed message to both players
                                let round_message = GameMessage::RoundCompleted {
                                    room_id: room_id.clone(),
                                    player1_choice,
                                    player2_choice,
                                    round_winner,
                                    round_result,
                                    game_result: room.game_result.clone(),
                                };
                                
                                if let Some(player1) = room.player1 {
                                    self.runtime.send_message(player1, round_message.clone());
                                }
                                if let Some(player2) = room.player2 {
                                    self.runtime.send_message(player2, round_message.clone());
                                }
                                
                                // Check if game is finished
                                if room.game_result.is_finished {
                                    if let Some(winner) = room.game_result.winner {
                                        eprintln!("[MESSAGE] Game finished! Winner: {:?}", winner);
                                        
                                        // Send game finished message
                                        let game_finished_message = GameMessage::GameFinished {
                                            room_id: room_id.clone(),
                                            winner,
                                            final_result: room.game_result.clone(),
                                        };
                                        
                                        if let Some(player1) = room.player1 {
                                            self.runtime.send_message(player1, game_finished_message.clone());
                                        }
                                        if let Some(player2) = room.player2 {
                                            self.runtime.send_message(player2, game_finished_message.clone());
                                        }
                                        
                                        // Update leaderboard stats only for non-private rooms
                                        if !room.private {
                                            if let Some(player1) = room.player1 {
                                                let won = winner == player1;
                                                self.update_leaderboard_stats(player1, won).await;
                                            }
                                            if let Some(player2) = room.player2 {
                                                let won = winner == player2;
                                                self.update_leaderboard_stats(player2, won).await;
                                            }
                                        } else {
                                            eprintln!(
                                                "[LEADERBOARD] Skipping leaderboard update for private room {}", 
                                                room_id
                                            );
                                        }
                                        
                                        // Remove room from available rooms and clean up
                                        let mut available_rooms = self.state.available_rooms.get().clone();
                                        available_rooms.retain(|id| id != &room_id);
                                        self.state.available_rooms.set(available_rooms);
                                    }
                                }
                            }
                        }
                        
                        let _ = self.state.rooms.insert(&room_id, room);
                    } else {
                        eprintln!("[MESSAGE] Failed to set choice for player {:?} in room {}", player_chain, room_id);
                    }
                } else {
                    eprintln!("[MESSAGE] Room {} not found for choice submission", room_id);
                }
            }
            
            GameMessage::RoundCompleted { room_id, player1_choice, player2_choice, round_winner, round_result, game_result } => {
                eprintln!("[MESSAGE] Processing RoundCompleted for room {}", room_id);
                eprintln!("[MESSAGE] Player 1 chose {:?}, Player 2 chose {:?}", player1_choice, player2_choice);
                eprintln!("[MESSAGE] Round winner: {:?}, Result: {:?}", round_winner, round_result);
                eprintln!("[MESSAGE] Game status: P1 wins: {}, P2 wins: {}, Draws: {}, Finished: {}", 
                    game_result.player1_wins, game_result.player2_wins, game_result.draws, game_result.is_finished);
                
                // Update local room information if this player is in the room
                // This is mainly for UI updates on player chains
            }
            
            GameMessage::GameFinished { room_id, winner, final_result } => {
                eprintln!("[MESSAGE] Processing GameFinished for room {}", room_id);
                eprintln!("[MESSAGE] Winner: {:?}", winner);
                eprintln!("[MESSAGE] Final result: P1 wins: {}, P2 wins: {}, Draws: {}", 
                    final_result.player1_wins, final_result.player2_wins, final_result.draws);
                
                let current_chain = self.runtime.chain_id();
                
                // Update personal stats if this player was in the game
                let won = winner == current_chain;
                let timestamp = self.runtime.system_time().micros();
                
                let mut my_stats = self.state.my_stats.get().clone().unwrap_or_else(|| PlayerStats::new(current_chain));
                my_stats.add_game(won, timestamp);
                self.state.my_stats.set(Some(my_stats));
                
                // Remove room from my rooms
                let mut my_rooms = self.state.my_rooms.get().clone();
                my_rooms.retain(|id| id != &room_id);
                self.state.my_rooms.set(my_rooms);
                
                // Clear current room if it was this room
                if self.state.my_current_room.get().as_ref() == Some(&room_id) {
                    self.state.my_current_room.set(None);
                }
                
                eprintln!("[MESSAGE] Updated personal stats for game completion");
            }
            
            GameMessage::UpdateLeaderboard { player_chain, won } => {
                eprintln!("[MESSAGE] Processing UpdateLeaderboard for {:?}, won: {}", player_chain, won);
                
                // Only process on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[MESSAGE] This is NOT the leaderboard chain, ignoring UpdateLeaderboard message");
                    return;
                }
                
                self.update_leaderboard_stats(player_chain, won).await;
            }
            
            GameMessage::UpdatePlayerName { player_chain, player_name } => {
                eprintln!("[MESSAGE] Processing UpdatePlayerName for {:?}: '{}'", player_chain, player_name);
                
                // Only process on leaderboard chain
                if !*self.state.is_leaderboard_chain.get() {
                    eprintln!("[MESSAGE] This is NOT the leaderboard chain, ignoring UpdatePlayerName message");
                    return;
                }
                
                // Store the player name mapping
                let _ = self.state.player_names.insert(&player_chain, player_name);
                eprintln!("[MESSAGE] Updated player name for chain {:?}", player_chain);
            }
        }
    }

    async fn store(mut self) {
        let _ = self.state.save().await;
    }
}

impl RockPaperScissorsContract {
    async fn update_leaderboard_stats(&mut self, player_chain: ChainId, won: bool) {
        eprintln!("[LEADERBOARD] Updating stats for {:?}, won: {}", player_chain, won);
        
        let timestamp = self.runtime.system_time().micros();
        
        // Get or create player stats
        let mut stats = match self.state.player_stats.get(&player_chain).await {
            Ok(Some(existing_stats)) => existing_stats,
            _ => PlayerStats::new(player_chain),
        };
        
        // Update stats
        stats.add_game(won, timestamp);
        
        // Save updated stats
        let _ = self.state.player_stats.insert(&player_chain, stats.clone());
        
        // Rebuild global leaderboard
        self.rebuild_global_leaderboard().await;
        
        eprintln!("[LEADERBOARD] Updated stats for {:?}: games={}, wins={}, losses={}, win_rate={:.2}%", 
            player_chain, stats.games_played, stats.games_won, stats.games_lost, stats.win_rate());
    }
    
    /// Rebuild the global leaderboard from all player stats
    async fn rebuild_global_leaderboard(&mut self) {
        // Collect all player stats
        let mut all_entries = Vec::new();

        // Get all player chain IDs who have stats
        match self.state.player_stats.indices().await {
            Ok(player_chains) => {
                eprintln!("[LEADERBOARD] Found {} players with stats", player_chains.len());

                for player_chain in player_chains {
                    if let Ok(Some(stats)) = self.state.player_stats.get(&player_chain).await {
                        // Get player name if available
                        let player_name = match self.state.player_names.get(&player_chain).await {
                            Ok(Some(name)) => Some(name),
                            _ => None,
                        };
                        
                        let entry = LeaderboardEntry {
                            chain_id: stats.chain_id,
                            wins: stats.games_won,
                            losses: stats.games_lost,
                            total_games: stats.games_played,
                            player_name: player_name.clone(),
                        };
                        all_entries.push(entry);
                        eprintln!("[LEADERBOARD] Added {:?} ({:?}) with {} wins to rebuild list", player_chain, player_name, stats.games_won);
                    }
                }
            }
            Err(_) => {
                eprintln!("[LEADERBOARD] Failed to get player chains, returning");
                return;
            }
        }

        // Sort by wins descending, then by win rate, then by total games
        all_entries.sort_by(|a, b| {
            b.wins.cmp(&a.wins)
                .then_with(|| b.win_rate().partial_cmp(&a.win_rate()).unwrap_or(std::cmp::Ordering::Equal))
                .then_with(|| b.total_games.cmp(&a.total_games))
        });
        eprintln!("[LEADERBOARD] Sorted {} entries", all_entries.len());

        // Take top 100
        let top_100: Vec<LeaderboardEntry> = all_entries.into_iter().take(100).collect();
        eprintln!("[LEADERBOARD] Taking top {} entries for leaderboard", top_100.len());

        // Update the global leaderboard
        self.state.global_leaderboard.set(top_100.clone());
        eprintln!("[LEADERBOARD] Global leaderboard updated with {} entries", top_100.len());
        
        // Log final leaderboard state
        eprintln!("[LEADERBOARD] Final leaderboard state:");
        for (i, entry) in top_100.iter().take(10).enumerate() {
            let display_name = entry.player_name.as_ref().map(|s| s.as_str()).unwrap_or("Anonymous");
            eprintln!("[LEADERBOARD] #{}: {} ({:?}) - {} wins, {:.2}% win rate ({} total games)", 
                i + 1, display_name, entry.chain_id, entry.wins, entry.win_rate(), entry.total_games);
        }
        
        eprintln!("[LEADERBOARD] Rebuild completed successfully");
    }
}

#[ComplexObject]
impl RockPaperScissorsState {}