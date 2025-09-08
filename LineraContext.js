import { useEffect, useState, createContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LineraGameClient from "../../LineraGameClient";

const LineraContext = createContext();

const LineraContextProvider = ({ children }) => {
  const [lineraClient, setLineraClient] = useState(null);
  const [room, setRoom] = useState({});
  const [player_1, setPlayer_1] = useState("");
  const [player_2, setPlayer_2] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerChainId, setPlayerChainId] = useState("");
  const [roomPolling, setRoomPolling] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Initialize Linera client
    const client = new LineraGameClient();
    setLineraClient(client);

    // Initialize player with demo chain ID and owner
    // In a real app, these would come from user input or wallet connection
    const initializePlayer = async () => {
      try {
        const demoChainId = "47578fd433d92356466706f80498aa23645285282b27c9a03f8cc7598dc32021";
        const demoOwner = "User:7136460f0c87ae46f966f898d494c4b40c4ae8c527f4d1c0b1fa0f7cff91d20f";
        
        await client.initializePlayer(demoChainId, demoOwner);
        setPlayerChainId(demoChainId);
        setPlayer_1(demoChainId); // Use chainId as player identifier
        setIsInitialized(true);
        console.log("Player initialized successfully");
      } catch (error) {
        console.error("Failed to initialize player:", error);
        // Continue without initialization - some features may be limited
      }
    };

    initializePlayer();
  }, []);

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

    try {
      await lineraClient.joinRoom(roomId);
      
      // Start polling for room state updates
      const stopPolling = lineraClient.startPollingRoomState(roomId, (error, roomState) => {
        if (error) {
          console.error("Error polling room state:", error);
          return;
        }

        if (roomState) {
          updateRoomState(roomState);
        }
      });

      setRoomPolling(stopPolling);
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
      players: {}
    };

    // Set up players
    if (roomState.player1) {
      convertedRoom.players[roomState.player1] = {
        option: roomState.player1Choice ? roomState.player1Choice.toLowerCase() : "",
        optionLock: !!roomState.player1Choice,
        score: roomState.gameResult ? roomState.gameResult.player1Wins : 0
      };
    }

    if (roomState.player2) {
      convertedRoom.players[roomState.player2] = {
        option: roomState.player2Choice ? roomState.player2Choice.toLowerCase() : "",
        optionLock: !!roomState.player2Choice,
        score: roomState.gameResult ? roomState.gameResult.player2Wins : 0
      };
      
      // Set player_2 when second player joins
      if (!player_2) {
        setPlayer_2(roomState.player2);
      }
    }

    setRoom(convertedRoom);

    // Check for game end condition (first to 3 wins)
    if (roomState.gameResult && roomState.gameResult.isFinished) {
      const pathname = "/result";
      if (pathname !== location.pathname) {
        navigate(pathname);
      }
    }
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

  // Update room (for compatibility with existing components)
  const updateRoom = (updatedRoom) => {
    // In the original Socket.IO version, this would emit room:update
    // In Linera version, the choice submission handles the update
    // We'll just update local state and let polling handle the real update
    setRoom(updatedRoom);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (roomPolling) {
        roomPolling();
      }
    };
  }, [roomPolling]);

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
        // Linera-specific methods
        lineraClient,
        isInitialized,
        submitChoice,
        createRoom,
        joinRoom: joinRoom,
        updateRoom
      }}
    >
      {children}
    </LineraContext.Provider>
  );
};

export { LineraContextProvider, LineraContext };