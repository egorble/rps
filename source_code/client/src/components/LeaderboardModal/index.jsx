import { useState, useEffect, useContext, useRef } from "react";
import { LineraContext } from "../../context/SocketContext";
import * as XLSX from "xlsx";
import styles from "./styles.module.css";

const LeaderboardModal = ({ isOpen, onClose }) => {
  const { lineraClient, startLeaderboardMonitoring, stopLeaderboardMonitoring } = useContext(LineraContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isMounted = useRef(true);

  // Function to fetch leaderboard data
  const fetchLeaderboard = async () => {
    console.log("fetchLeaderboard called");
    console.log("lineraClient available:", !!lineraClient);
    console.log("isMounted.current:", isMounted.current);
    
    if (!lineraClient) {
      console.log("Skipping fetch - lineraClient is false");
      return;
    }
    
    // Don't check isMounted here initially as it might not be set yet
    console.log("Fetching leaderboard data...");
    setIsLoading(true);
    setError("");
    
    try {
      const query = `
        query {
          globalLeaderboard {
            chainId
            totalGames
            wins
            losses
            playerName
          }
        }
      `;
      
      console.log("Making GraphQL request to:", lineraClient.getReadChainEndpoint());
      const response = await lineraClient.makeGraphQLRequest(
        lineraClient.getReadChainEndpoint(),
        query
      );
      
      console.log("Leaderboard response:", response);
      
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      
      // Check if still mounted before updating state
      if (isMounted.current) {
        setLeaderboard(response.data.globalLeaderboard || []);
        console.log("Leaderboard data set:", response.data.globalLeaderboard || []);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      // Check if still mounted before updating state
      if (isMounted.current) {
        setError("Failed to fetch leaderboard: " + err.message);
      }
    } finally {
      // Check if still mounted before updating state
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Export leaderboard to XLSX format
  const exportToSheets = () => {
    if (leaderboard.length === 0) return;
    
    // Prepare data for export
    const sortedLeaderboard = [...leaderboard].sort((a, b) => 
      b.wins - a.wins || a.losses - b.losses
    );
    
    const exportData = sortedLeaderboard.map((player, index) => {
      const winRate = player.totalGames > 0 
        ? ((player.wins / player.totalGames) * 100).toFixed(1) 
        : "0.0";
      
      return {
        Rank: index + 1,
        "Player Name": player.playerName || 'Unknown Player',
        "Chain ID": player.chainId,
        Games: player.totalGames,
        Wins: player.wins,
        Losses: player.losses,
        "Win Rate": `${winRate}%`
      };
    });
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard");
    
    // Export to file
    XLSX.writeFile(workbook, "leaderboard.xlsx");
  };

  // Fetch leaderboard when modal opens
  useEffect(() => {
    console.log("Leaderboard modal isOpen changed:", isOpen);
    console.log("lineraClient in useEffect:", !!lineraClient);
    if (isOpen) {
      console.log("Modal is open, calling fetchLeaderboard");
      fetchLeaderboard();
    } else {
      console.log("Modal is closed, not fetching leaderboard");
    }
  }, [isOpen, lineraClient]);

  // Setup leaderboard monitoring for real-time updates
  useEffect(() => {
    // Set mounted to true when component mounts
    isMounted.current = true;
    console.log("Component mounted, isMounted set to true");
    
    if (isOpen && lineraClient) {
      console.log("Setting up leaderboard monitoring...");
      // Start monitoring for blockchain notifications (for real-time updates only)
      const setupMonitoring = async () => {
        try {
          await startLeaderboardMonitoring(() => {
            // When a blockchain notification is received, refresh the leaderboard
            // Only update if we're not currently loading to prevent conflicts
            if (isMounted.current && !isLoading) {
              console.log("Blockchain notification received, refreshing leaderboard...");
              fetchLeaderboard();
            }
          });
        } catch (err) {
          console.error("Failed to setup leaderboard monitoring:", err);
          if (isMounted.current) {
            setError("Failed to setup real-time updates: " + err.message);
          }
        }
      };
      
      setupMonitoring();
    }
    
    // Cleanup function
    return () => {
      console.log("Component unmounting, isMounted set to false");
      isMounted.current = false;
      if (isOpen) {
        stopLeaderboardMonitoring();
      }
    };
  }, [isOpen, lineraClient, isLoading]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Global Leaderboard</h2>
        
        {/* Export button */}
        <div className={styles.exportContainer}>
          <button 
            className={styles.exportButton} 
            onClick={exportToSheets}
            disabled={leaderboard.length === 0 || isLoading}
          >
            Export to Excel
          </button>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {isLoading ? (
          <div className={styles.loading}>Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className={styles.loading}>No leaderboard data available</div>
        ) : (
          <div className={styles.leaderboardContainer}>
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player Name</th>
                  <th>Chain ID</th>
                  <th>Games</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard
                  .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
                  .map((player, index) => {
                    const winRate = player.totalGames > 0 
                      ? ((player.wins / player.totalGames) * 100).toFixed(1) 
                      : "0.0";
                    
                    return (
                      <tr key={player.chainId}>
                        <td>{index + 1}</td>
                        <td>{player.playerName || 'Unknown Player'}</td>
                        <td className={styles.chainId}>
                          {player.chainId.substring(0, 8)}...
                        </td>
                        <td>{player.totalGames}</td>
                        <td>{player.wins}</td>
                        <td>{player.losses}</td>
                        <td>{winRate}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
        
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default LeaderboardModal;