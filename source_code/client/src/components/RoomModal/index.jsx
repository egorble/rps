import { useState, useContext } from "react";
import { LineraContext } from "../../context/SocketContext";
import styles from "./styles.module.css";

const RoomModal = ({ isOpen, onClose }) => {
  const { createRoom, joinRoom, navigate } = useContext(LineraContext);
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateRoom = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const newRoomId = await createRoom("friend");
      navigate(`/room/${newRoomId}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError("Failed to create room: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (isLoading || !roomId.trim()) {
      setError("Please enter a room ID");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      await joinRoom(roomId.trim());
      navigate(`/room/${roomId.trim()}`);
    } catch (err) {
      console.error("Failed to join room:", err);
      setError("Failed to join room: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Play with Friend</h2>
        
        <div className={styles.buttonContainer}>
          <button 
            className={styles.modalButton} 
            onClick={handleCreateRoom}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Room"}
          </button>
          
          <div className={styles.joinSection}>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className={styles.roomInput}
              disabled={isLoading}
            />
            <button 
              className={styles.modalButton} 
              onClick={handleJoinRoom}
              disabled={isLoading}
            >
              {isLoading ? "Joining..." : "Join Room"}
            </button>
          </div>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default RoomModal;