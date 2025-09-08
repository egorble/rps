import { useState, useContext, useEffect } from "react";
import { LineraContext } from "../../context/LineraContext";
import rock_right_hand_img from "../../images/rock_right_hand.png";
import paper_right_hand_img from "../../images/paper_right_hand.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import styles from "./styles.module.css";

function Controls() {
  const [option, setOption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { room, player_1, submitChoice } = useContext(LineraContext);

  // Get current player's state
  const currentPlayer = room.players && room.players[player_1];
  const isLocked = currentPlayer ? currentPlayer.optionLock : false;
  const currentChoice = currentPlayer ? currentPlayer.option : "";

  useEffect(() => {
    // Update local option state when room state changes
    if (currentChoice) {
      setOption(currentChoice);
    } else {
      setOption("");
    }
  }, [currentChoice]);

  const handleChange = async ({ currentTarget: input }) => {
    if (isLocked || isSubmitting) return;

    setIsSubmitting(true);
    const choice = input.value;
    setOption(choice);

    try {
      // Submit choice to Linera
      await submitChoice(choice);
      console.log("Choice submitted successfully:", choice);
    } catch (error) {
      console.error("Failed to submit choice:", error);
      alert(`Failed to submit choice: ${error.message}`);
      // Reset on error
      setOption("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isLocked || isSubmitting || !currentPlayer;

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
          alt="paper_hand"
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
          alt="scissors_hand"
          className={styles.option_btn_img}
        />
      </button>
      
      {isSubmitting && (
        <div style={{ 
          color: "#fff", 
          textAlign: "center", 
          marginTop: "10px",
          fontSize: "14px"
        }}>
          Submitting choice to blockchain...
        </div>
      )}
      
      {isLocked && !isSubmitting && (
        <div style={{ 
          color: "#4ec9b0", 
          textAlign: "center", 
          marginTop: "10px",
          fontSize: "14px"
        }}>
          Choice submitted: {option.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default Controls;