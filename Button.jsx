import { useContext, useState } from "react";
import { LineraContext } from "../../context/LineraContext";
import btn_background_img from "../../images/btn_background.png";
import styles from "./styles.module.css";

const Button = ({ name, type, roomId, onClick }) => {
  const { createRoom, joinRoom, navigate, isInitialized } = useContext(LineraContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (type) => {
    // If custom onClick is provided, use it instead of default behavior
    if (onClick) {
      onClick();
      return;
    }

    if (!isInitialized) {
      alert("Please wait for initialization to complete");
      return;
    }

    setIsLoading(true);
    
    try {
      let resultRoomId;
      
      if (type === "private") {
        // Create private room
        resultRoomId = await createRoom("private");
      } else if (type === "public") {
        // Create public room
        resultRoomId = await createRoom("public");
      } else if (type === "stranger") {
        // Join existing room or create new public room
        resultRoomId = await createRoom("stranger");
      } else if (type === "join" && roomId) {
        // Join specific room by ID
        await joinRoom(roomId);
        resultRoomId = roomId;
      }

      if (resultRoomId) {
        navigate(`/room/${resultRoomId}`);
      }
    } catch (error) {
      console.error("Failed to handle room action:", error);
      alert(`Failed to ${type === "stranger" ? "join/create" : type} room: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      className={styles.btn} 
      onClick={() => handleChange(type)}
      disabled={isLoading || !isInitialized}
    >
      <img
        src={btn_background_img}
        alt="btn_background_img"
        className={styles.btn_background_img}
      />
      {isLoading ? "Loading..." : name}
    </button>
  );
};

export default Button;