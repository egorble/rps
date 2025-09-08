// Copyright (c) Zefchain Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/*! ABI of the Rock Paper Scissors Cross-Chain Application */

use async_graphql::{Request, Response};
use linera_sdk::linera_base_types::{ChainId, ContractAbi, ServiceAbi};
use serde::{Deserialize, Serialize};

pub struct RockPaperScissorsAbi;

impl ContractAbi for RockPaperScissorsAbi {
    type Operation = Operation;
    type Response = ();
}

impl ServiceAbi for RockPaperScissorsAbi {
    type Query = Request;
    type QueryResponse = Response;
}

// Game choice enumeration
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, async_graphql::Enum)]
pub enum Choice {
    Rock,
    Paper,
    Scissors,
}

// Game result for a single round
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, async_graphql::Enum)]
pub enum RoundResult {
    Win,
    Lose,
    Draw,
}

// Round history entry
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct RoundHistory {
    pub round_number: u8,
    pub player1_choice: Choice,
    pub player2_choice: Choice,
    pub result: RoundResult,
    pub winner: Option<ChainId>,
}

// Overall game result (best of 5)
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct GameResult {
    pub player1_wins: u8,
    pub player2_wins: u8,
    pub draws: u8,
    pub winner: Option<ChainId>, // None if game not finished
    pub is_finished: bool,
}

// Game room structure
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct GameRoom {
    pub room_id: String,
    pub player1: Option<ChainId>,
    pub player2: Option<ChainId>,
    pub player1_name: Option<String>,
    pub player2_name: Option<String>,
    pub player1_choice: Option<Choice>,
    pub player2_choice: Option<Choice>,
    pub game_result: GameResult,
    pub created_at: u64,
    pub round_number: u8, // Current round (1-5)
    pub private: bool, // Whether the room is private or public
    pub round_history: Vec<RoundHistory>, // History of completed rounds
}

// Leaderboard entry for global statistics
#[derive(Debug, Clone, Serialize, Deserialize, async_graphql::SimpleObject)]
pub struct LeaderboardEntry {
    pub chain_id: ChainId,
    pub player_name: Option<String>,
    pub wins: u64,
    pub losses: u64,
    pub total_games: u64,
}

// Application parameters for leaderboard configuration
#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct ApplicationParameters {
    pub leaderboard_chain_id: Option<ChainId>,
}

// Cross-chain messages
#[derive(Debug, Clone, Deserialize, Serialize)]
pub enum GameMessage {
    // Request to join a room on leaderboard chain
    JoinRoom {
        room_id: String,
        player_chain: ChainId,
        player_name: Option<String>,
    },
    // Confirmation that player joined room
    PlayerJoined {
        room_id: String,
        player_chain: ChainId,
        success: bool,
    },
    // Submit a choice for current round
    SubmitChoice {
        room_id: String,
        player_chain: ChainId,
        choice: Choice,
    },
    // Round completed notification
    RoundCompleted {
        room_id: String,
        player1_choice: Choice,
        player2_choice: Choice,
        round_winner: Option<ChainId>,
        round_result: RoundResult,
        game_result: GameResult,
    },
    // Game finished notification
    GameFinished {
        room_id: String,
        winner: ChainId,
        final_result: GameResult,
    },
    // Update leaderboard stats
    UpdateLeaderboard {
        player_chain: ChainId,
        won: bool,
    },
    // Update player name on leaderboard chain
    UpdatePlayerName {
        player_chain: ChainId,
        player_name: String,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub enum Operation {
    // Setup operations
    SetupLeaderboard {
        leaderboard_chain_id: ChainId,
    },
    
    // Player name operations
    SetPlayerName {
        name: String,
    },
    
    // Game operations (only allowed on leaderboard chain)
    CreateRoom {
        room_id: String,
        private: bool,
    },
    
    // Player operations (allowed on any chain)
    JoinRoom {
        room_id: String,
    },
    SubmitChoice {
        room_id: String,
        choice: Choice,
    },
    
    // Query operations
    GetAvailableRooms,
    GetRoom {
        room_id: String,
    },
    GetLeaderboard,
    GetMyStats,
    
    // Admin operations (only on leaderboard chain)
    ResetLeaderboard,
}

impl Choice {
    /// Returns true if this choice beats the other choice
    pub fn beats(&self, other: &Choice) -> bool {
        matches!(
            (self, other),
            (Choice::Rock, Choice::Scissors)
                | (Choice::Paper, Choice::Rock)
                | (Choice::Scissors, Choice::Paper)
        )
    }
    
    /// Compare two choices and return the result for the first choice
    pub fn compare(&self, other: &Choice) -> RoundResult {
        if self == other {
            RoundResult::Draw
        } else if self.beats(other) {
            RoundResult::Win
        } else {
            RoundResult::Lose
        }
    }
}

impl GameRoom {
    pub fn new(room_id: String, timestamp: u64, private: bool) -> Self {
        Self {
            room_id,
            player1: None,
            player2: None,
            player1_name: None,
            player2_name: None,
            player1_choice: None,
            player2_choice: None,
            game_result: GameResult {
                player1_wins: 0,
                player2_wins: 0,
                draws: 0,
                winner: None,
                is_finished: false,
            },
            created_at: timestamp,
            round_number: 1,
            private,
            round_history: Vec::new(),
        }
    }
    
    pub fn is_full(&self) -> bool {
        self.player1.is_some() && self.player2.is_some()
    }
    
    pub fn can_join(&self, chain_id: ChainId) -> bool {
        !self.game_result.is_finished && 
        (self.player1.is_none() || 
         (self.player2.is_none() && self.player1 != Some(chain_id)))
    }
    
    pub fn add_player(&mut self, chain_id: ChainId) -> bool {
        if !self.can_join(chain_id) {
            return false;
        }
        
        if self.player1.is_none() {
            self.player1 = Some(chain_id);
        } else if self.player2.is_none() {
            self.player2 = Some(chain_id);
        } else {
            return false;
        }
        
        true
    }
    
    pub fn get_player_number(&self, chain_id: ChainId) -> Option<u8> {
        if self.player1 == Some(chain_id) {
            Some(1)
        } else if self.player2 == Some(chain_id) {
            Some(2)
        } else {
            None
        }
    }
    
    pub fn both_players_chose(&self) -> bool {
        self.player1_choice.is_some() && self.player2_choice.is_some()
    }
    
    pub fn set_choice(&mut self, chain_id: ChainId, choice: Choice) -> bool {
        match self.get_player_number(chain_id) {
            Some(1) => {
                self.player1_choice = Some(choice);
                true
            }
            Some(2) => {
                self.player2_choice = Some(choice);
                true
            }
            Some(_) => false, // Invalid player number
            None => false,
        }
    }
    
    pub fn calculate_round_result(&mut self) -> Option<(RoundResult, Option<ChainId>)> {
        if let (Some(choice1), Some(choice2)) = (self.player1_choice, self.player2_choice) {
            let result = choice1.compare(&choice2);
            
            let winner = match result {
                RoundResult::Win => self.player1,
                RoundResult::Lose => self.player2,
                RoundResult::Draw => None,
            };
            
            // Add round to history before clearing choices
            self.round_history.push(RoundHistory {
                round_number: self.round_number,
                player1_choice: choice1,
                player2_choice: choice2,
                result,
                winner,
            });
            
            // Update game result based on round result
            match result {
                RoundResult::Win => {
                    self.game_result.player1_wins += 1;
                    if self.game_result.player1_wins >= 3 {
                        self.game_result.winner = self.player1;
                        self.game_result.is_finished = true;
                    }
                }
                RoundResult::Lose => {
                    self.game_result.player2_wins += 1;
                    if self.game_result.player2_wins >= 3 {
                        self.game_result.winner = self.player2;
                        self.game_result.is_finished = true;
                    }
                }
                RoundResult::Draw => {
                    self.game_result.draws += 1;
                }
            }
            
            // Clear choices for next round
            self.player1_choice = None;
            self.player2_choice = None;
            
            // Increment round number if game not finished
            if !self.game_result.is_finished {
                self.round_number += 1;
            }
            
            Some((result, winner))
        } else {
            None
        }
    }
}

impl LeaderboardEntry {
    pub fn new(chain_id: ChainId) -> Self {
        Self {
            chain_id,
            player_name: None,
            wins: 0,
            losses: 0,
            total_games: 0,
        }
    }
    
    pub fn new_with_name(chain_id: ChainId, player_name: Option<String>) -> Self {
        Self {
            chain_id,
            player_name,
            wins: 0,
            losses: 0,
            total_games: 0,
        }
    }
    
    pub fn add_game(&mut self, won: bool) {
        self.total_games += 1;
        if won {
            self.wins += 1;
        } else {
            self.losses += 1;
        }
    }
    
    /// Calculate win rate as percentage (0-100)
    pub fn win_rate(&self) -> f64 {
        if self.total_games > 0 {
            (self.wins as f64) / (self.total_games as f64) * 100.0
        } else {
            0.0
        }
    }
}