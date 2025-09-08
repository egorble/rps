import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineraContext } from "../../context/LineraContext";
import Button from "../../components/Button";
import win_img from "../../images/win.png";
import lose_img from "../../images/lose.png";
import styles from "./styles.module.css";

const Result = () => {
  const { room, player_1, lineraClient } = useContext(LineraContext);
  const [gameResult, setGameResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get the final game result
    if (room.players && lineraClient) {
      const player1Data = room.players[player_1];
      const player2Data = room.players[Object.keys(room.players).find(id => id !== player_1)];
      
      if (player1Data && player2Data) {
        const player1Score = player1Data.score || 0;
        const player2Score = player2Data.score || 0;
        
        let winner = "tie";
        if (player1Score > player2Score) {
          winner = "win";
        } else if (player2Score > player1Score) {
          winner = "lose";
        }
        
        setGameResult({
          winner,
          player1Score,
          player2Score
        });
      }
    }
  }, [room, player_1, lineraClient]);

  const handlePlayAgain = () => {
    navigate("/");
  };

  if (!gameResult) {
    return (
      <div style={{ 
        color: "#fff", 
        textAlign: "center", 
        marginTop: "50px",
        fontSize: "18px"
      }}>
        Loading results...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.result_section}>
        {gameResult.winner === "win" && (
          <>
            <img src={win_img} alt="You Won!" className={styles.result_img} />
            <h1 className={styles.result_text}>🎉 YOU WON! 🎉</h1>
          </>
        )}
        
        {gameResult.winner === "lose" && (
          <>
            <img src={lose_img} alt="You Lost" className={styles.result_img} />
            <h1 className={styles.result_text}>😢 YOU LOST 😢</h1>
          </>
        )}
        
        {gameResult.winner === "tie" && (
          <h1 className={styles.result_text}>🤝 IT'S A TIE! 🤝</h1>
        )}
      </div>
      
      <div className={styles.score_section}>
        <h2>Final Score</h2>
        <div className={styles.score_display}>
          <div className={styles.score_item}>
            <span>You:</span>
            <span className={styles.score_number}>{gameResult.player1Score}</span>
          </div>
          <div className={styles.score_divider}>-</div>
          <div className={styles.score_item}>
            <span>Opponent:</span>
            <span className={styles.score_number}>{gameResult.player2Score}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.play_again_btn}
          onClick={handlePlayAgain}
        >
          🔄 Play Again
        </button>
      </div>
    </div>
  );
};

export default Result;