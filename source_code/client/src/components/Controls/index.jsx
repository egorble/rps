import { useState, useContext, useEffect } from "react";
import { LineraContext } from "../../context/SocketContext";
import rock_right_hand_img from "../../images/rock_right_hand.png";
import paper_right_hand_img from "../../images/paper_right_hand.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import styles from "./styles.module.css";

function Controls() {
  const [option, setOption] = useState("");
  const { socket, room, submitChoice, animationLock } = useContext(LineraContext);

  useEffect(() => {
    const playerId = socket.id;
    if (room.players && room.players[playerId]) {
      setOption(room.players[playerId].option);
    } else {
      setOption("");
    }
  }, [room, socket.id]);

  // Check if player has already made a choice
  const hasPlayerChosen = () => {
    const playerId = socket.id;
    if (!room.players) return false;
    return room.players[playerId] && room.players[playerId].optionLock;
  };

  const handleChange = async ({ currentTarget: input }) => {
    // Prevent changing choice if already locked
    if (hasPlayerChosen()) {
      return;
    }
    
    setOption(input.value);
    
    // Use Linera submitChoice instead of socket.emit
    try {
      await submitChoice(input.value);
      console.log('Choice submitted:', input.value);
    } catch (error) {
      console.error('Failed to submit choice:', error);
      // Reset option on error
      setOption("");
    }
  };

  // Determine if controls should be disabled
  const isDisabled = hasPlayerChosen() || animationLock;

  return (
    <div className={styles.container}>
      <button
        disabled={isDisabled}
        className={
          option === "rock"
            ? `${styles.option_btn} ${styles.option_btn_active}`
            : styles.option_btn
        }
        onClick={handleChange}
        value="rock"
      >
        <img
          src={rock_right_hand_img}
          alt="rock_hand"
          className={styles.option_btn_img}
        />
      </button>
      <button
        disabled={isDisabled}
        className={
          option === "paper"
            ? `${styles.option_btn} ${styles.option_btn_active}`
            : styles.option_btn
        }
        onClick={handleChange}
        value="paper"
      >
        <img
          src={paper_right_hand_img}
          alt="rock_hand"
          className={styles.option_btn_img}
        />
      </button>
      <button
        disabled={isDisabled}
        className={
          option === "scissors"
            ? `${styles.option_btn} ${styles.option_btn_active}`
            : styles.option_btn
        }
        onClick={handleChange}
        value="scissors"
      >
        <img
          src={scissors_right_hand_img}
          alt="rock_hand"
          className={styles.option_btn_img}
        />
      </button>
    </div>
  );
}

export default Controls;