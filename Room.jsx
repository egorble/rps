import { useEffect, useContext, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { LineraContext } from "../../context/LineraContext";
import PlayerOne from "../../components/PlayerOne";
import PlayerTwo from "../../components/PlayerTwo";
import Controls from "../../components/Controls";
import vs_img from "../../images/vs.jpg";
import win_img from "../../images/win.png";
import lose_img from "../../images/lose.png";
import boom_img from "../../images/boom.png";
import styles from "./styles.module.css";

const Room = () => {
  const [result, setResult] = useState({
    rotate: 0,
    show: false,
    reset: false,
  });
  const [resultText, setResultText] = useState("");
  const [roomState, setRoomState] = useState(null);
  const [lastGameState, setLastGameState] = useState(null);
  
  const { room, player_1, player_2, joinRoom, lineraClient } = useContext(LineraContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomId } = useParams();

  // Join room when component mounts
  useEffect(() => {
    if (roomId && lineraClient) {
      joinRoom(roomId).catch((error) => {
        console.error("Failed to join room:", error);
        navigate("/");
      });
    }
  }, [roomId, lineraClient, joinRoom, navigate]);

  // Poll for detailed room state from Linera
  useEffect(() => {
    if (!roomId || !lineraClient) return;

    const pollRoomState = async () => {
      try {
        const state = await lineraClient.getRoomState(roomId);
        setRoomState(state);
      } catch (error) {
        console.error("Failed to get room state:", error);
      }
    };

    // Initial poll
    pollRoomState();

    // Set up polling interval
    const intervalId = setInterval(pollRoomState, 2000);

    return () => clearInterval(intervalId);
  }, [roomId, lineraClient]);

  // Calculate and show results when both players have made choices
  useEffect(() => {
    const calculateResults = async () => {
      if (!roomState || !roomState.player1Choice || !roomState.player2Choice) return;

      // Check if this is a new game state
      const currentGameState = `${roomState.player1Choice}-${roomState.player2Choice}`;
      if (currentGameState === lastGameState) return;

      setLastGameState(currentGameState);

      // Calculate result
      let result = { text: "tie" };
      if (roomState.player1Choice !== roomState.player2Choice) {
        const isPlayer1Winner = validateChoice(roomState.player1Choice, roomState.player2Choice);
        
        if (roomState.player1 === player_1) {
          result.text = isPlayer1Winner ? "win" : "lose";
        } else {
          result.text = isPlayer1Winner ? "lose" : "win";
        }
      }

      await performAnimation(result.text);
    };

    calculateResults();
  }, [roomState, player_1, lastGameState]);

  // Check for game end condition
  useEffect(() => {
    if (roomState && roomState.gameResult && roomState.gameResult.isFinished) {
      const pathname = "/result";
      if (pathname !== location.pathname) {
        navigate(pathname);
      }
    }
  }, [roomState, location.pathname, navigate]);

  const validateChoice = (choice1, choice2) => {
    const winConditions = {
      "ROCK": "SCISSORS",
      "PAPER": "ROCK", 
      "SCISSORS": "PAPER"
    };
    
    return winConditions[choice1] === choice2;
  };

  const performAnimation = async (text) => {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));

    for (let i = 0; i <= 8; i++) {
      if (i === 7) {
        setResult({ rotate: 0, show: true, reset: false });
        setResultText(text);
        await timer(2000);
      } else if (i % 2 === 0 && i < 7) {
        setResult({ rotate: 10, show: false, reset: false });
        await timer(200);
      } else if (i === 8) {
        setResult({ rotate: 0, show: false, reset: true });
        setResultText("");
      } else {
        setResult({ rotate: -10, show: false, reset: false });
        await timer(200);
      }
    }

    return Promise.resolve();
  };

  // Show loading state while waiting for room data
  if (!room.players || Object.keys(room.players).length === 0) {
    return (
      <div style={{ 
        color: "#fff", 
        textAlign: "center", 
        marginTop: "50px",
        fontSize: "18px"
      }}>
        <div>Connecting to room...</div>
        <div style={{ fontSize: "14px", marginTop: "10px", color: "#888" }}>
          Room ID: {roomId}
        </div>
      </div>
    );
  }

  return (
    <>
      <img src={vs_img} alt="vs" className={styles.background_img} />
      <PlayerOne result={result} />
      <PlayerTwo result={result} />
      
      {/* Show controls only if we have a second player or if we're waiting */}
      {(player_2 || !roomState?.player2) && <Controls />}
      
      {/* Show waiting message if no second player */}
      {!player_2 && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#fff",
          textAlign: "center",
          fontSize: "18px",
          zIndex: 10
        }}>
          <div>Waiting for opponent...</div>
          <div style={{ fontSize: "14px", marginTop: "10px", color: "#888" }}>
            Share this room ID: {roomId}
          </div>
        </div>
      )}

      {/* Game state info */}
      {roomState && (
        <div style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          color: "#fff",
          fontSize: "12px",
          background: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "5px"
        }}>
          <div>Room: {roomId}</div>
          {roomState.gameResult && (
            <>
              <div>Player 1 Wins: {roomState.gameResult.player1Wins}</div>
              <div>Player 2 Wins: {roomState.gameResult.player2Wins}</div>
              <div>Draws: {roomState.gameResult.draws}</div>
            </>
          )}
        </div>
      )}

      {/* Result animations */}
      {resultText === "win" && (
        <img src={win_img} alt="win_img" className={styles.win_img} />
      )}
      {resultText === "lose" && (
        <img src={lose_img} alt="lose_img" className={styles.lose_img} />
      )}
      {resultText === "tie" && (
        <img src={boom_img} alt="boom_img" className={styles.boom_img} />
      )}
    </>
  );
};

export default Room;