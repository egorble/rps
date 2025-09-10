import { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { LineraContext } from "../../context/SocketContext";
import * as XLSX from "xlsx";
import styles from "./styles.module.css";

const LeaderboardModal = ({ isOpen, onClose }) => {
  const { lineraClient, startLeaderboardMonitoring, stopLeaderboardMonitoring } = useContext(LineraContext);
  const [leaderboardMap, setLeaderboardMap] = useState(new Map()); // Use Map for efficient updates
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const isMounted = useRef(true);
  const lastFetchTime = useRef(0);
  const fetchTimeoutRef = useRef(null);

  // Convert map to array for rendering
  const leaderboardArray = useMemo(() => {
    return Array.from(leaderboardMap.values());
  }, [leaderboardMap]);

  // Memoize sorted leaderboard data
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboardArray].sort((a, b) => 
      b.wins - a.wins || a.losses - b.losses
    );
  }, [leaderboardArray]);

  // Function to fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    console.log("fetchLeaderboard called");
    
    if (!lineraClient) {
      console.log("Skipping fetch - lineraClient is false");
      return;
    }
    
    // Rate limiting - minimum 2 seconds between fetches
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      console.log("Rate limited - skipping fetch");
      return;
    }
    
    lastFetchTime.current = now;
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
        // Update the leaderboard map with new data, only changing what's necessary
        setLeaderboardMap(prevMap => {
          const newMap = new Map(prevMap);
          const newData = response.data.globalLeaderboard || [];
          
          // Create a set of current chainIds for quick lookup
          const currentChainIds = new Set(newData.map(entry => entry.chainId));
          
          // Remove entries that no longer exist
          for (const chainId of newMap.keys()) {
            if (!currentChainIds.has(chainId)) {
              newMap.delete(chainId);
            }
          }
          
          // Update or add entries
          for (const entry of newData) {
            const existingEntry = newMap.get(entry.chainId);
            
            // Only update if the entry has actually changed
            if (!existingEntry ||
                existingEntry.totalGames !== entry.totalGames ||
                existingEntry.wins !== entry.wins ||
                existingEntry.losses !== entry.losses ||
                existingEntry.playerName !== entry.playerName) {
              newMap.set(entry.chainId, entry);
            }
          }
          
          return newMap;
        });
        
        console.log("Leaderboard data updated");
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
  }, [lineraClient]);

  // Debounced update function
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    // Minimum 2 seconds between updates
    if (timeSinceLastFetch < 2000) {
      // Clear existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Schedule update for later
      fetchTimeoutRef.current = setTimeout(() => {
        fetchLeaderboard();
      }, 2000 - timeSinceLastFetch);
    } else {
      // Update immediately
      fetchLeaderboard();
    }
  }, [fetchLeaderboard]);

  // Export leaderboard to XLSX format
  const exportToSheets = useCallback(() => {
    if (sortedLeaderboard.length === 0) return;
    
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
  }, [sortedLeaderboard]);

  // Fetch leaderboard when modal opens
  useEffect(() => {
    console.log("Leaderboard modal isOpen changed:", isOpen);
    if (isOpen) {
      console.log("Modal is open, calling fetchLeaderboard");
      fetchLeaderboard();
    } else {
      console.log("Modal is closed, clearing leaderboard");
      // Clear the leaderboard when modal closes
      setLeaderboardMap(new Map());
    }
  }, [isOpen, fetchLeaderboard]);

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
              console.log("Blockchain notification received, scheduling leaderboard update...");
              debouncedUpdate();
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
      
      // Clear any pending updates
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [isOpen, lineraClient, isLoading, debouncedUpdate]);

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
            disabled={sortedLeaderboard.length === 0 || isLoading}
          >
            Export to Excel
          </button>
        </div>
        
        {error && <div className={styles.error}>{error}</div>}
        
        {isLoading && leaderboardArray.length === 0 ? (
          <div className={styles.loading}>Loading leaderboard...</div>
        ) : sortedLeaderboard.length === 0 ? (
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
                {sortedLeaderboard.map((player, index) => {
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