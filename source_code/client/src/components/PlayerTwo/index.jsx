import { useRef, useState, useEffect, useContext } from "react";
import { LineraContext } from "../../context/SocketContext";
import JoinLink from "../JoinLink";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import rock_right_hand_img from "../../images/rock_right_hand.png";
import paper_right_hand_img from "../../images/paper_right_hand.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import styles from "./styles.module.css";

const PlayerTwo = ({ result }) => {
  const [option, setOption] = useState("rock");
  const [score, setScore] = useState(0);
  const rockHand = useRef();
  const { room, playerChainId } = useContext(LineraContext);

  useEffect(() => {
    // PlayerTwo should always show the opponent's hand
    let opponentId = null;
    
    console.log("PlayerTwo - room:", room);
    console.log("PlayerTwo - playerChainId:", playerChainId);
    
    // Find the opponent (the other player that's not the current player)
    if (room.player1 && room.player1 !== playerChainId) {
      opponentId = room.player1;
    } else if (room.player2 && room.player2 !== playerChainId) {
      opponentId = room.player2;
    }
    
    console.log("PlayerTwo - opponentId:", opponentId);
    
    if (result.show && room.players && opponentId && room.players[opponentId]) {
      const newOption = room.players[opponentId].option || "rock";
      const newScore = room.players[opponentId].score || 0;
      console.log("PlayerTwo - updating option to:", newOption);
      console.log("PlayerTwo - updating score to:", newScore);
      setOption(newOption);
      setScore(newScore);
      if (rockHand.current) {
        rockHand.current.style.transform = `rotate(${result.rotate}deg)`;
      }
    } else if (result.reset) {
      // Only reset the option, not the score
      console.log("PlayerTwo - resetting option");
      setOption("rock");
    } else {
      if (rockHand.current) {
        rockHand.current.style.transform = `rotate(${result.rotate}deg)`;
      }
    }
  }, [result, room.players, playerChainId, room.player1, room.player2]);

  // Update score when room state changes
  useEffect(() => {
    // PlayerTwo should always show the opponent's hand
    let opponentId = null;
    
    // Find the opponent (the other player that's not the current player)
    if (room.player1 && room.player1 !== playerChainId) {
      opponentId = room.player1;
    } else if (room.player2 && room.player2 !== playerChainId) {
      opponentId = room.player2;
    }
    
    if (opponentId && room.players && room.players[opponentId]) {
      const newScore = room.players[opponentId].score || 0;
      setScore(newScore);
    }
  }, [room.players, playerChainId, room.player1, room.player2]);

  // Get opponent name
  const getOpponentName = () => {
    // PlayerTwo should always show the opponent's name
    // The opponent is the player who is NOT the current player
    if (room.player1 && room.player1 !== playerChainId && room.player1Name) {
      console.log("PlayerTwo (opponent) name:", room.player1Name);
      return room.player1Name;
    } else if (room.player2 && room.player2 !== playerChainId && room.player2Name) {
      console.log("PlayerTwo (opponent) name:", room.player2Name);
      return room.player2Name;
    }
    
    // Fallback to shortened chain ID if name is not available
    // Find the opponent ID
    let opponentId = null;
    if (room.player1 && room.player1 !== playerChainId) {
      opponentId = room.player1;
    } else if (room.player2 && room.player2 !== playerChainId) {
      opponentId = room.player2;
    }
    
    if (opponentId) {
      const name = `${opponentId.substring(0, 8)}...`;
      console.log("PlayerTwo (opponent) fallback name:", name);
      return name;
    }
    console.log("PlayerTwo (opponent) default name: Opponent");
    return "Opponent";
  };

  return (
    <div className={styles.container}>
      {/* Only show join link for private rooms (when playing with friend) */}
      {!room.player2 && room.id && room.private && (
        <JoinLink
          link={`${window.location.origin}/room/${room.id}`}
        />
      )}
      {!room.player2 && (
        <div className={styles.opponent_container}>
          <div className={styles.opponent_card}>
            <PersonIcon />
          </div>
          <p className={styles.opponent_text}>
            waiting for opponent connection...
          </p>
        </div>
      )}
      {room.player2 && (
        <div className={styles.player_info}>
          <div className={styles.star_container}>
            {[...Array(3).keys()].map((ele, index) =>
              index + 1 <= score ? (
                <StarIcon
                  key={index}
                  className={`${styles.star} ${styles.active_star}`}
                />
              ) : (
                <StarIcon key={index} className={styles.star} />
              )
            )}
          </div>
          <div className={styles.person}>
            <PersonIcon />
          </div>
        </div>
      )}
      {option === "rock" && room.player2 && (
        <img
          src={rock_right_hand_img}
          alt="rock_right_hand_img"
          className={styles.rock_right_hand_img}
          ref={rockHand}
        />
      )}
      {option === "paper" && room.player2 && (
        <img
          src={paper_right_hand_img}
          alt="paper_right_hand_img"
          className={styles.paper_right_hand_img}
        />
      )}
      {option === "scissors" && room.player2 && (
        <img
          src={scissors_right_hand_img}
          alt="scissors_right_hand_img"
          className={styles.scissors_right_hand_img}
        />
      )}
      {room.player2 && (
        <div className={styles.player_name}>
          {getOpponentName()}
        </div>
      )}
    </div>
  );
};

export default PlayerTwo;