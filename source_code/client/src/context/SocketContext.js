import { useEffect, useState, createContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LineraGameClient from "../lib/LineraGameClient";

const LineraContext = createContext();

const LineraContextProvider = ({ children }) => {
  const [lineraClient, setLineraClient] = useState(null);
  const [room, setRoom] = useState({ players: {}, roundHistory: [] });
  const [player_1, setPlayer_1] = useState(null); // Initialize as null
  const [player_2, setPlayer_2] = useState(null); // Initialize as null
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerChainId, setPlayerChainId] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [animatedRounds, setAnimatedRounds] = useState(new Set()); // Track animated rounds
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent multiple initializations
    if (lineraClient) return;
    
    // Initialize Linera client
    const client = new LineraGameClient();
    setLineraClient(client);

    // Don't automatically initialize player chain
    // Chain will be created when user registers
    setIsInitialized(true);
  }, []); // Empty dependency array to run only once

  // Create room function
  const createRoom = async (type, roomId = null) => {
    if (!lineraClient || !isInitialized) {
      throw new Error("Linera client not initialized");
    }

    try {
      let result;
      
      if (type === "private") {
        result = await lineraClient.createPrivateRoom();
      } else if (type === "public") {
        result = await lineraClient.playWithStrangers();
      } else if (type === "stranger") {
        result = await lineraClient.playWithStrangers();
      } else if (type === "friend") {
        result = await lineraClient.createPrivateRoom();
      }

      return result.roomId;
    } catch (error) {
      console.error("Failed to create/join room:", error);
      throw error;
    }
  };

  // Join room function
  const joinRoom = async (roomId) => {
    if (!lineraClient || !isInitialized) {
      throw new Error("Linera client not initialized");
    }

    // Prevent multiple join attempts for the same room
    if (currentRoomId === roomId && isMonitoring) {
      console.log(`Already monitoring room ${roomId}, skipping duplicate attempt`);
      return true;
    }

    try {
      // Stop previous monitoring if switching rooms
      if (currentRoomId && currentRoomId !== roomId && isMonitoring) {
        console.log(`Switching from room ${currentRoomId} to ${roomId}`);
        lineraClient.stopRoomMonitoring(currentRoomId);
        setIsMonitoring(false);
      }

      await lineraClient.joinRoom(roomId);
      setCurrentRoomId(roomId);
      
      // Start simple room monitoring
      if (!isMonitoring || currentRoomId !== roomId) {
        console.log(`Starting monitoring for room: ${roomId}`);
        
        await lineraClient.startRoomMonitoring(roomId, (error, roomState) => {
          if (error) {
            console.error("Error in room monitoring:", error);
            return;
          }

          if (roomState) {
            console.log('🔄 Room state updated via blockchain notification:', roomState.roomId);
            updateRoomState(roomState);
          }
        });
        
        setIsMonitoring(true);
      }
      return true;
    } catch (error) {
      console.error("Failed to join room:", error);
      throw error;
    }
  };

  // Update room state and handle game logic
  const updateRoomState = (roomState) => {
    console.log("Room state updated:", roomState);
    
    // Convert Linera room state to Socket.IO-like format for compatibility
    const convertedRoom = {
      id: roomState.roomId,
      player1: roomState.player1, // Store player1 ID
      player2: roomState.player2, // Store player2 ID
      player1Name: roomState.player1Name || null, // Store player1 name
      player2Name: roomState.player2Name || null, // Store player2 name
      private: roomState.private || false, // Include private flag
      players: {},
      roundHistory: roomState.roundHistory || [],
      gameResult: roomState.gameResult || null // Include gameResult for checking if game is finished
    };

    console.log("Converted room:", convertedRoom);
    
    // Check if both players have made their choices
    const bothPlayersChosen = roomState.player1Choice && roomState.player2Choice;
    
    // Set up players
    if (roomState.player1) {
      // Preserve existing score if available, otherwise use gameResult
      const existingScore = room.players && room.players[roomState.player1] ? room.players[roomState.player1].score : 0;
      const score = roomState.gameResult ? roomState.gameResult.player1Wins : existingScore;
      
      convertedRoom.players[roomState.player1] = {
        option: roomState.player1Choice ? roomState.player1Choice.toLowerCase() : "",
        optionLock: bothPlayersChosen, // Only lock when both players have chosen
        score: score
      };
      
      // Set player_1 when first player joins (if not already set)
      if (!player_1) {
        setPlayer_1(roomState.player1);
      }
    }

    if (roomState.player2) {
      // Preserve existing score if available, otherwise use gameResult
      const existingScore = room.players && room.players[roomState.player2] ? room.players[roomState.player2].score : 0;
      const score = roomState.gameResult ? roomState.gameResult.player2Wins : existingScore;
      
      convertedRoom.players[roomState.player2] = {
        option: roomState.player2Choice ? roomState.player2Choice.toLowerCase() : "",
        optionLock: bothPlayersChosen, // Only lock when both players have chosen
        score: score
      };
      
      // Set player_2 when second player joins
      if (!player_2) {
        setPlayer_2(roomState.player2);
      }
    }

    setRoom(convertedRoom);
    console.log("Final room state:", convertedRoom);

    // The game end navigation is now handled in the Room component to ensure animations complete first
    // Check for game end condition (first to 3 wins) is done in Room component
  };

  // Submit choice function
  const submitChoice = async (choice) => {
    if (!lineraClient || !isInitialized || !room.id) {
      throw new Error("Cannot submit choice: game not ready");
    }

    try {
      const lineraChoice = choice.toUpperCase(); // Convert to ROCK/PAPER/SCISSORS
      await lineraClient.submitChoice(room.id, lineraChoice);
    } catch (error) {
      console.error("Failed to submit choice:", error);
      throw error;
    }
  };

  // Start leaderboard monitoring
  const startLeaderboardMonitoring = async (callback) => {
    if (!lineraClient || !isInitialized) {
      throw new Error("Linera client not initialized");
    }

    try {
      await lineraClient.startLeaderboardMonitoring(callback);
    } catch (error) {
      console.error("Failed to start leaderboard monitoring:", error);
      throw error;
    }
  };

  // Stop leaderboard monitoring
  const stopLeaderboardMonitoring = () => {
    if (lineraClient) {
      lineraClient.stopLeaderboardMonitoring();
    }
  };

  // Reset room state
  const resetRoom = () => {
    setRoom({ players: {}, roundHistory: [] });
    setPlayer_1(null);
    setPlayer_2(null);
    setCurrentRoomId(null);
    setIsMonitoring(false);
    setAnimatedRounds(new Set());
  };

  // Update room (for compatibility with existing components)
  const updateRoom = (updatedRoom) => {
    // In the original Socket.IO version, this would emit room:update
    // In Linera version, the choice submission handles the update
    // We'll just update local state and let polling handle the real update
    setRoom(updatedRoom);
  };

  // Cleanup monitoring on unmount only
  useEffect(() => {
    return () => {
      if (lineraClient && currentRoomId) {
        console.log('Context cleanup: stopping room monitoring due to unmount');
        lineraClient.stopRoomMonitoring(currentRoomId);
        lineraClient.disconnectWebSocket();
      }
    };
  }, []); // Only run on unmount

  return (
    <LineraContext.Provider
      value={{
        // Socket.IO compatibility layer
        socket: {
          id: playerChainId,
          emit: (event, data, callback) => {
            if (event === "room:create") {
              createRoom(data.type)
                .then(roomId => callback(null, roomId))
                .catch(error => callback(error));
            } else if (event === "room:join") {
              joinRoom(data.roomId)
                .then(() => callback(null, room))
                .catch(error => callback(error));
            } else if (event === "room:update") {
              updateRoom(data);
            }
          }
        },
        room,
        setRoom,
        player_1,
        player_2,
        navigate,
        // Linera-specific properties
        lineraClient,
        isInitialized,
        submitChoice,
        createRoom,
        joinRoom: joinRoom,
        updateRoom,
        resetRoom,
        startLeaderboardMonitoring, // Add leaderboard monitoring functions
        stopLeaderboardMonitoring,  // Add leaderboard monitoring functions
        playerChainId,
        setPlayerChainId // Expose setPlayerChainId to allow setting it from outside
      }}
    >
      {children}
    </LineraContext.Provider>
  );
};

export { LineraContextProvider, LineraContext };