import { useState, useContext } from "react";
import Button from "../../components/Button";
import { LineraContext } from "../../context/LineraContext";
import logo_img from "../../images/logo.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import rock_left_hand_img from "../../images/rock_left_hand.png";
import styles from "./styles.module.css";

const Home = () => {
  const [roomId, setRoomId] = useState("");
  const { isInitialized, playerChainId } = useContext(LineraContext);

  return (
    <>
      <div className={styles.left}>
        <img src={logo_img} alt="logo" className={styles.logo} />
      </div>
      <div className={styles.right}>
        <img
          src={scissors_right_hand_img}
          alt="paper_hand"
          className={styles.paper_hand}
        />
        <img
          src={rock_left_hand_img}
          alt="rock_hand"
          className={styles.rock_hand}
        />
        <div className={styles.btn_container}>
          {!isInitialized && (
            <div style={{ color: "#fff", marginBottom: "10px", textAlign: "center" }}>
              Initializing Linera connection...
            </div>
          )}
          
          <input
            type="text"
            placeholder="Enter Room ID (for private rooms)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={styles.room_input}
          />
          
          <Button name="Create Private Room" type="private" />
          <Button name="Create Public Room" type="public" />
          <Button name="Join Public Room" type="stranger" />
          
          {roomId && (
            <Button name="Join Private Room" type="join" roomId={roomId} />
          )}
          
          {isInitialized && (
            <div style={{ 
              color: "#888", 
              fontSize: "12px", 
              marginTop: "10px", 
              textAlign: "center",
              wordBreak: "break-all"
            }}>
              Player Chain: {playerChainId ? playerChainId.substring(0, 20) + "..." : "Loading..."}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;