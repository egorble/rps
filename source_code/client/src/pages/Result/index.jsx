import { useEffect, useState, useContext } from "react";
import { LineraContext } from "../../context/SocketContext";
import Button from "../../components/Button";
import win_background_img from "../../images/win_background.png";
import rock_left_hand_img from "../../images/rock_left_hand.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import win_board_img from "../../images/win_board.png";
import lose_board_1_img from "../../images/lose_board_1.png";
import lose_board_2_img from "../../images/lose_board_2.png";
import lose_board_3_img from "../../images/lose_board_3.png";
import styles from "./styles.module.css";
import { useNavigate } from "react-router-dom";

const Result = () => {
  const [boardImg, setBoardImg] = useState("");
  const { room, playerChainId, lineraClient, resetRoom } = useContext(LineraContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Result component - room:", room);
    console.log("Result component - playerChainId:", playerChainId);
    
    if (room.players && playerChainId && room.players[playerChainId]) {
      let score = room.players[playerChainId].score;
      console.log("Player score:", score);

      if (score === 3) setBoardImg(win_board_img);
      else if (score === 2) setBoardImg(lose_board_2_img);
      else if (score === 1) setBoardImg(lose_board_1_img);
      else setBoardImg(lose_board_3_img);
    }
  }, [room.players, playerChainId]);

  const handleReturnHome = () => {
    // Stop monitoring any room before navigating home
    if (room?.id && lineraClient) {
      console.log("Stopping room monitoring before returning home:", room.id);
      lineraClient.stopRoomMonitoring(room.id);
    }
    // Reset room state
    resetRoom();
    navigate("/");
  };

  return (
    <div className={styles.container}>
      {boardImg === win_board_img && (
        <img
          src={win_background_img}
          alt="win_background_img"
          className={styles.win_background_img}
        />
      )}
      <img
        src={rock_left_hand_img}
        alt="rock_left_hand_img"
        className={styles.rock_hand}
      />
      <img
        src={scissors_right_hand_img}
        alt="scissors_right_hand_img"
        className={styles.scissors_hand}
      />
      <img src={boardImg} alt="boardImg" className={styles.board_img} />
      <div className={styles.btn_container}>
        <Button name="Return home" onClick={handleReturnHome} />
      </div>
    </div>
  );
};

export default Result;