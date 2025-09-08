import { useEffect, useRef, useState, useContext } from "react";
import { LineraContext } from "../../context/SocketContext";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import rock_left_hand_img from "../../images/rock_left_hand.png";
import paper_left_hand_img from "../../images/paper_left_hand.png";
import scissors_left_hand_img from "../../images/scissors_left_hand.png";
import styles from "./styles.module.css";

const PlayerOne = ({ result }) => {
  const [option, setOption] = useState("rock");
  const [score, setScore] = useState(0);
  const rockHand = useRef();
  const { room, playerChainId } = useContext(LineraContext);

  useEffect(() => {
    // PlayerOne should always show the current player's hand
    let currentPlayerId = null;
    
    // Find the current player ID
    if (room.player1 === playerChainId) {
      currentPlayerId = room.player1;
    } else if (room.player2 === playerChainId) {
      currentPlayerId = room.player2;
    }
    
    if (result.show && room.players && currentPlayerId && room.players[currentPlayerId]) {
      const newOption = room.players[currentPlayerId].option || "rock";
      const newScore = room.players[currentPlayerId].score || 0;
      setOption(newOption);
      setScore(newScore);
      if (rockHand.current) {
        rockHand.current.style.transform = `rotate(${result.rotate}deg)`;
      }
    } else if (result.reset) {
      // Only reset the option, not the score
      setOption("rock");
    } else {
      if (rockHand.current) {
        rockHand.current.style.transform = `rotate(${result.rotate}deg)`;
      }
    }
  }, [result, room.players, playerChainId, room.player1, room.player2]);

  // Update score when room state changes
  useEffect(() => {
    // PlayerOne should always show the current player's score
    let currentPlayerId = null;
    
    // Find the current player ID
    if (room.player1 === playerChainId) {
      currentPlayerId = room.player1;
    } else if (room.player2 === playerChainId) {
      currentPlayerId = room.player2;
    }
    
    if (currentPlayerId && room.players && room.players[currentPlayerId]) {
      const newScore = room.players[currentPlayerId].score || 0;
      setScore(newScore);
    }
  }, [room.players, playerChainId, room.player1, room.player2]);

  // Get player name
  const getPlayerName = () => {
    // PlayerOne should always show the current player's name
    if (room.player1 === playerChainId && room.player1Name) {
      console.log("PlayerOne (current player) name:", room.player1Name);
      return room.player1Name;
    } else if (room.player2 === playerChainId && room.player2Name) {
      console.log("PlayerOne (current player) name:", room.player2Name);
      return room.player2Name;
    }
    
    // Fallback to shortened chain ID if name is not available
    if (playerChainId) {
      const name = `${playerChainId.substring(0, 8)}...`;
      console.log("PlayerOne (current player) fallback name:", name);
      return name;
    }
    console.log("PlayerOne (current player) default name: You");
    return "You";
  };

  return (
    <div className={styles.container}>
      <div className={styles.player_info}>
        <div className={styles.person}>
          <PersonIcon />
        </div>
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
      </div>
      {option === "rock" && (
        <img
          src={rock_left_hand_img}
          alt="rock_left_hand_img"
          className={styles.rock_left_hand_img}
          ref={rockHand}
        />
      )}
      {option === "paper" && (
        <img
          src={paper_left_hand_img}
          alt="paper_left_hand_img"
          className={styles.paper_left_hand_img}
        />
      )}
      {option === "scissors" && (
        <img
          src={scissors_left_hand_img}
          alt="scissors_left_hand_img"
          className={styles.scissors_left_hand_img}
        />
      )}
      <div className={styles.player_name}>
        {getPlayerName()}
      </div>
    </div>
  );
};

export default PlayerOne;