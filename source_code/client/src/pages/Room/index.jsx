import { useEffect, useContext, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineraContext } from "../../context/SocketContext";
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
  const [currentRound, setCurrentRound] = useState(0); // Track current round for animations
  const [animatedRounds, setAnimatedRounds] = useState(new Set()); // Track which rounds have been animated
  const [gameFinished, setGameFinished] = useState(false); // Track if game is finished
  const [animationComplete, setAnimationComplete] = useState(false); // Track if animation is complete
  const animatedRoundsRef = useRef(animatedRounds); // Ref to access animated rounds in callbacks
  
  const { socket, room, player_1, player_2, updateRoom, setRoom, playerChainId, navigate, lineraClient, setAnimationLock, setIsAnimating } = useContext(LineraContext);
  const location = useLocation();

  // Update ref when animatedRounds changes
  useEffect(() => {
    animatedRoundsRef.current = animatedRounds;
  }, [animatedRounds]);

  // Cleanup room monitoring when component unmounts
  useEffect(() => {
    return () => {
      // Stop monitoring the current room when leaving the room page
      if (room?.id && lineraClient) {
        console.log("Unmounting Room component, stopping room monitoring for:", room.id);
        lineraClient.stopRoomMonitoring(room.id);
      }
      // Reset room state when leaving the room
      // resetRoom();
    };
  }, [room?.id, lineraClient]);

  useEffect(() => {
    let roomId = location.pathname.split("/")[2];
    let size = Object.keys(socket).length;

    console.log("Joining room:", roomId);
    console.log("Socket size:", size);

    if (size > 0) {
      socket.emit("room:join", { roomId }, (err, room) => {
        if (err) {
          console.error("Error joining room:", err);
          navigate("/");
        } else {
          console.log("Successfully joined room:", room);
        }
      });
    }
  }, [socket]);

  // Handle game finished navigation after animation
  useEffect(() => {
    if (gameFinished && animationComplete) {
      // Add 3 second delay before navigating to results
      console.log("Game finished and animation complete, waiting 3 seconds before navigating to result page");
      setTimeout(() => {
        console.log("3 seconds passed, navigating to result page");
        // Stop monitoring the room before navigating away
        if (room?.id && lineraClient) {
          console.log("Stopping room monitoring before navigating to results:", room.id);
          lineraClient.stopRoomMonitoring(room.id);
        }
        navigate("/result");
      }, 3000); // 3 second delay
    }
  }, [gameFinished, animationComplete, navigate, room?.id, lineraClient]);

  // Handle round history animations
  useEffect(() => {
    const animateRoundHistory = async () => {
      const roundHistory = room?.roundHistory || [];
      let hasFinishedGame = false;
      let animationCompleted = false;
      
      console.log("Animating round history:", roundHistory);
      
      // Process each round in order
      for (const round of roundHistory) {
        // Skip if round has already been animated
        if (animatedRoundsRef.current.has(round.roundNumber)) {
          continue;
        }
        
        // Only animate rounds where both players have made choices
        if (round.player1Choice && round.player2Choice) {
          // Set animation lock to prevent room updates during animation
          setAnimationLock(true);
          setIsAnimating(true);
          
          // Mark this round as being animated
          setAnimatedRounds(prev => new Set(prev).add(round.roundNumber));
          
          // Determine the result text based on the round result
          // Check if current player is player1 or player2 to determine win/lose from their perspective
          let text = "tie";
          
          console.log("Processing round:", round);
          console.log("Current playerChainId:", playerChainId);
          
          if (round.result === "Player1Wins" || round.result === "WIN") {
            // If there's a winner, check if it's the current player
            if (round.winner) {
              text = (playerChainId && playerChainId === round.winner) ? "win" : "lose";
            } else if (playerChainId && playerChainId === round.player1) {
              // Fallback: if no winner field, assume player1 won
              text = "win";
            } else {
              text = "lose";
            }
          } else if (round.result === "Player2Wins") {
            text = (playerChainId && playerChainId === round.player2) ? "win" : "lose";
          } else if (round.result === "LOSE") {
            // If result is LOSE, check if current player is the loser or if they're the other player who won
            if (round.winner) {
              text = (playerChainId && playerChainId === round.winner) ? "win" : "lose";
            } else {
              // Fallback for LOSE without winner field
              text = "lose";
            }
          } else if (round.result === "Tie" || round.result === "DRAW") {
            text = "tie";
          } else {
            text = "tie";
          }
          
          console.log("Determined result text:", text);
          
          // Perform the animation with player choices
          await performAnimation(text, round.player1Choice, round.player2Choice);
          
          // Release animation lock after animation completes
          setAnimationLock(false);
          setIsAnimating(false);
          
          // Update current round
          setCurrentRound(round.roundNumber);
        }
      }
      
      // Check if game is finished after all animations
      if (room?.gameResult?.isFinished) {
        hasFinishedGame = true;
        console.log("Game is finished, setting hasFinishedGame to true");
      }
      
      // Mark animation as complete
      animationCompleted = true;
      setAnimationComplete(true);
      console.log("Animation completed, setting animationComplete to true");
      
      // If game is finished, set the game finished flag
      if (hasFinishedGame && animationCompleted) {
        console.log("Game finished and animation complete, navigating to result page");
        setTimeout(() => {
          setGameFinished(true);
        }, 100); // Small delay to ensure state is updated
      }
    };
    
    animateRoundHistory();
  }, [room?.roundHistory, room?.players, playerChainId, room?.player1, room?.player2, room?.gameResult?.isFinished, setAnimationLock, setIsAnimating]);

  const validateOptions = (value) => {
    switch (value) {
      case "rock paper":
        return { score: [0, 1], text: "lose" };
      case "paper scissors":
        return { score: [0, 1], text: "lose" };
      case "scissors rock":
        return { score: [0, 1], text: "lose" };
      case "paper rock":
        return { score: [1, 0], text: "win" };
      case "scissors paper":
        return { score: [1, 0], text: "win" };
      case "rock scissors":
        return { score: [1, 0], text: "win" };
      default:
        return { score: [0, 0], text: "tie" };
    }
  };

  const performAnimation = async (text, player1Choice, player2Choice) => {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));

    console.log("Starting animation with choices:", { player1Choice, player2Choice, text });

    // First phase: Hand shaking animation (4 cycles)
    console.log("Phase 1: Hand shaking");
    for (let i = 0; i < 4; i++) {
      setResult({ rotate: 10, show: false, reset: false });
      await timer(150);
      setResult({ rotate: -10, show: false, reset: false });
      await timer(150);
    }
  
    // Second phase: Show choices (reveal what each player chose)
    console.log("Phase 2: Show choices");
    
    // Create a deep copy of the current room state
    const updatedRoom = JSON.parse(JSON.stringify(room));
    
    // Preserve player names when updating room state
    updatedRoom.player1Name = room.player1Name;
    updatedRoom.player2Name = room.player2Name;
  
    // Get player IDs from the room object
    const player1Id = room.player1;
    const player2Id = room.player2;
  
    // Update each player's option with their choice, preserving existing properties including score
    if (player1Id) {
      if (!updatedRoom.players[player1Id]) {
        updatedRoom.players[player1Id] = {
          option: "",
          optionLock: false,
          score: 0
        };
      }
      updatedRoom.players[player1Id].option = player1Choice.toLowerCase();
    }
  
    if (player2Id) {
      if (!updatedRoom.players[player2Id]) {
        updatedRoom.players[player2Id] = {
          option: "",
          optionLock: false,
          score: 0
        };
      }
      updatedRoom.players[player2Id].option = player2Choice.toLowerCase();
    }
  
    // Update the room state so Player components can access the choices
    setRoom(updatedRoom);
    setResult({ rotate: 0, show: true, reset: false });
    await timer(1000); // Show choices for 1 second
  
    // Third phase: Show result (win/lose/tie)
    console.log("Phase 3: Show result", text);
    setResultText(text);
    await timer(2000);
  
    // Fourth phase: Reset for next round
    console.log("Phase 4: Reset");
    setResult({ rotate: 0, show: false, reset: true });
    setResultText("");
    await timer(500);

    console.log("Animation complete");
    return Promise.resolve();
  };

  return (
    <>
      <img src={vs_img} alt="vs" className={styles.background_img} />
      <PlayerOne result={result} />
      <PlayerTwo result={result} />
      {player_2 && <Controls />}
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