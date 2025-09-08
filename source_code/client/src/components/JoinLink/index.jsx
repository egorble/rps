import { useState } from "react";
import styles from "./styles.module.css";

const JoinLink = ({ link }) => {
  const [active, setActive] = useState(false);

  // Extract room ID from the link
  const roomId = link.split('/').pop();

  const handleChange = () => {
    setActive(true);
    // Copy only the room ID to clipboard instead of the full link
    navigator.clipboard.writeText(roomId);
  };

  return (
    <div className={styles.join_link_container}>
      <div className={styles.copy_link} onClick={handleChange}>
        {active ? "Copied !" : "Click to copy !"}
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