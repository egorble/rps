import { useContext, useState, useEffect } from "react";
import { LineraContext } from "../../context/SocketContext";
import Button from "../../components/Button";
import RoomModal from "../../components/RoomModal";
import LeaderboardModal from "../../components/LeaderboardModal";
import AuthModal from "../../components/AuthModal";
import logo_img from "../../images/logo.png";
import scissors_right_hand_img from "../../images/scissors_right_hand.png";
import rock_left_hand_img from "../../images/rock_left_hand.png";
import btn_background_img from "../../images/btn_background.png";
import styles from "./styles.module.css";

const Home = () => {
  const { playerChainId, lineraClient, setPlayerChainId } = useContext(LineraContext);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authType, setAuthType] = useState("login"); // 'login' or 'register'
  const [currentUser, setCurrentUser] = useState(null);

  // Check for saved user session on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('rockPaperScissorsUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData);
        
        // If user has a chainId, set it in the context and in the lineraClient
        if (userData.chainId) {
          setPlayerChainId(userData.chainId);
          
          // Also initialize the lineraClient with the user's chainId
          if (lineraClient) {
            lineraClient.setPlayerChainId(userData.chainId);
          }
        }
      } catch (error) {
        console.error("Failed to parse saved user data:", error);
        localStorage.removeItem('rockPaperScissorsUser');
      }
    }
  }, [setPlayerChainId, lineraClient]);

  // Function to set player name using GraphQL mutation
  const setPlayerNameMutation = async (playerName) => {
    if (!lineraClient || !playerName) return false;
    
    try {
      const mutation = `
        mutation {
          setPlayerName(name: "${playerName}")
        }
      `;
      
      await lineraClient.makeGraphQLRequest(
        lineraClient.getPlayerChainEndpoint(),
        mutation
      );
      
      console.log("Player name set successfully");
      return true;
    } catch (error) {
      console.error("Failed to set player name:", error);
      return false;
    }
  };

  // Function to save chain ID to database
  const saveChainIdToDatabase = async (discordUsername, chainId) => {
    try {
      const response = await fetch(`http://62.72.35.202:3003/api/auth/user/${discordUsername}/chain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chainId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to save chain ID");
      }
      
      console.log("Chain ID saved to database");
      return true;
    } catch (error) {
      console.error("Failed to save chain ID to database:", error);
      return false;
    }
  };

  // Function to handle play with friend button click
  const handlePlayWithFriend = () => {
    console.log("User clicked 'Play with friend' button");
    setIsRoomModalOpen(true);
  };

  // Function to handle leaderboard button click
  const handleLeaderboardClick = () => {
    console.log("User clicked 'Leaderboard' button - opening leaderboard modal");
    setIsLeaderboardModalOpen(true);
  };

  // Function to handle login button click
  const handleLoginClick = () => {
    setAuthType("login");
    setIsAuthModalOpen(true);
  };

  // Function to handle register button click
  const handleRegisterClick = () => {
    setAuthType("register");
    setIsAuthModalOpen(true);
  };

  // Function to handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rockPaperScissorsUser');
    console.log("User logged out");
  };

  // Function to handle authentication success
  const handleAuthSuccess = async (userData) => {
    console.log("Authentication successful:", userData);
    
    if (userData.action === "register") {
      // For registration, we need to:
      // 1. Create a chain for the user (using existing initializePlayer method)
      // 2. Set player name
      // 3. Save chain ID to database
      // 4. Update user data with chain ID
      
      console.log("Creating chain for new user...");
      try {
        // Initialize player chain using the existing method
        const chainId = await lineraClient.initializePlayer();
        console.log('New chain created:', chainId);
        
        if (chainId) {
          // Save chain ID to database
          await saveChainIdToDatabase(userData.discordUsername, chainId);
          
          // Set player name
          await setPlayerNameMutation(userData.playerName);
          
          // Update user data with chain ID
          const updatedUserData = { ...userData, chainId };
          setCurrentUser(updatedUserData);
          
          // Save user data to localStorage for persistence
          localStorage.setItem('rockPaperScissorsUser', JSON.stringify(updatedUserData));
          
          // Set chain ID in context
          setPlayerChainId(chainId);
        } else {
          console.error("Failed to create chain for user");
        }
      } catch (error) {
        console.error("Failed to create chain for user:", error);
      }
    } else {
      // For login, just set the user data
      setCurrentUser(userData);
      
      // Save user data to localStorage for persistence
      localStorage.setItem('rockPaperScissorsUser', JSON.stringify(userData));
      
      // If user has a chainId, set it in the context AND in the lineraClient
      if (userData.chainId) {
        setPlayerChainId(userData.chainId);
        
        // Also initialize the lineraClient with the user's chainId
        lineraClient.setPlayerChainId(userData.chainId);
        
        // Set player name
        await setPlayerNameMutation(userData.playerName);
      }
    }
  };

  // Function to close room modal
  const closeRoomModal = () => {
    setIsRoomModalOpen(false);
  };

  // Function to close leaderboard modal
  const closeLeaderboardModal = () => {
    setIsLeaderboardModalOpen(false);
  };

  // Function to close auth modal
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Small button component for login/register
  const SmallButton = ({ name, onClick }) => (
    <button className={styles.smallButtonWrapper} onClick={onClick}>
      <img
        src={btn_background_img}
        alt="btn_background_img"
        className={styles.smallButtonBackground}
      />
      {name}
    </button>
  );

  return (
    <>
      {/* Auth buttons moved outside of container */}
      <div className={styles.authButtons}>
        {currentUser ? (
          <div className={styles.userControls}>
            <div className={styles.welcomeMessage}>
              Welcome, {currentUser.discordUsername}!
            </div>
            <Button name="Exit" onClick={handleLogout} />
          </div>
        ) : (
          <>
            <SmallButton name="Login" onClick={handleLoginClick} />
            <SmallButton name="Register" onClick={handleRegisterClick} />
          </>
        )}
      </div>
      
      <div className={styles.left}>
        <img src={logo_img} alt="logo" className={styles.logo} />
        {/* Move play with friend button under the logo */}
        <div className={styles.logoButtonContainer}>
          <Button name="play with friend" onClick={handlePlayWithFriend} />
        </div>
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
          {/* Remove play with friend from here and keep only other buttons */}
          <Button name="Play with stranger" type="stranger" />
          <Button name="Leaderboard" onClick={handleLeaderboardClick} />
        </div>
      </div>
      {/* Display player chain ID in top left corner */}
      {playerChainId && (
        <div className={styles.playerChainId}>
          Chain ID: {playerChainId.substring(0, 8)}...
        </div>
      )}
      
      {/* Room Modal */}
      <RoomModal isOpen={isRoomModalOpen} onClose={closeRoomModal} />
      
      {/* Leaderboard Modal */}
      <LeaderboardModal 
        isOpen={isLeaderboardModalOpen} 
        onClose={closeLeaderboardModal} 
      />
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        authType={authType}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default Home;