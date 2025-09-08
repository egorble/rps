import { useContext } from "react";
import { LineraContext } from "../../context/SocketContext";
import btn_background_img from "../../images/btn_background.png";
import styles from "./styles.module.css";

const Button = ({ name, type, onClick, className }) => {
  const { socket, navigate } = useContext(LineraContext);

  const handleChange = (type) => {
    // If custom onClick is provided, use it instead of default behavior
    if (onClick) {
      onClick();
      return;
    }
    
    socket.emit("room:create", { type }, (err, roomId) => {
      if (err) {
        console.error("Failed to create room:", err);
        alert("Failed to create room: " + err.message);
      } else {
        navigate(`/room/${roomId}`);
      }
    });
  };

  // Combine the default button class with any additional classes
  const buttonClass = className ? `${styles.btn} ${className}` : styles.btn;

  return (
    <button className={buttonClass} onClick={() => handleChange(type)}>
      <img
        src={btn_background_img}
        alt="btn_background_img"
        className={styles.btn_background_img}
      />
      {name}
    </button>
  );
};

export default Button;