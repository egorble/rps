import { useState } from "react";
import styles from "./styles.module.css";

const JoinLink = ({ link }) => {
  const [active, setActive] = useState(false);
  const [feedback, setFeedback] = useState("Click to copy !");

  // Extract room ID from the link
  const roomId = link.split('/').pop();

  const handleChange = async () => {
    try {
      // Copy only the room ID to clipboard instead of the full link
      await navigator.clipboard.writeText(roomId);
      setActive(true);
      setFeedback("Copied !");
      
      // Reset the feedback after 2 seconds
      setTimeout(() => {
        setActive(false);
        setFeedback("Click to copy !");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy room ID:", err);
      setFeedback("Failed to copy. Click again.");
      
      // Reset the feedback after 2 seconds
      setTimeout(() => {
        setFeedback("Click to copy !");
      }, 2000);
    }
  };

  return (
    <div className={styles.join_link_container}>
      <div className={styles.copy_link} onClick={handleChange}>
        {feedback}
      </div>
      <button
        className={
          active
            ? `${styles.join_link} ${styles.join_link_active}`
            : styles.join_link
        }
        onClick={handleChange}
      >
        Room ID: {roomId}
      </button>
      <h2 className={styles.join_link_text}>
        Send this room ID to your friend to connect.
      </h2>
    </div>
  );
};

export default JoinLink;