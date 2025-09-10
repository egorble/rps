import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import styles from "./styles.module.css";

const AuthModal = ({ isOpen, onClose, authType, onAuthSuccess }) => {
  const [discordUsername, setDiscordUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Simple hash function for password (in production, use proper encryption)
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (authType === "register") {
        console.log("Attempting to register user:", discordUsername);
        
        // Check if user already exists
        const { data: existingUsers, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('discord_username', discordUsername);

        if (fetchError) {
          console.error("Error checking existing user:", fetchError);
          throw new Error(fetchError.message || "Error checking existing user");
        }

        console.log("Existing users check result:", existingUsers);

        if (existingUsers && existingUsers.length > 0) {
          throw new Error("Discord username already exists");
        }

        // Hash the password
        const hashedPassword = simpleHash(password);
        console.log("Hashed password:", hashedPassword);

        // Insert new user directly into database
        const { data, error } = await supabase
          .from('user_profiles')
          .insert([
            {
              discord_username: discordUsername,
              password: hashedPassword, // In production, use proper encryption
              player_name: discordUsername,
              chain_id: null
            }
          ])
          .select()
          .single();

        if (error) {
          console.error("Registration error:", error);
          throw new Error(error.message || "Registration failed");
        }

        console.log("Registration successful, user data:", data);

        // After successful registration, call success callback
        onAuthSuccess({ 
          userId: data.id,
          discordUsername,
          playerName: discordUsername,
          chainId: null,
          action: "register" 
        });
      } else {
        console.log("Attempting to login user:", discordUsername);
        
        // Login user by checking database directly
        const { data: users, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('discord_username', discordUsername);

        if (error) {
          console.error("Login error:", error);
          throw new Error(error.message || "Login failed");
        }

        console.log("Login query result:", users);

        if (!users || users.length === 0) {
          throw new Error("Invalid credentials");
        }

        const user = users[0];

        // Check password
        const hashedPassword = simpleHash(password);
        console.log("Comparing passwords:", { input: hashedPassword, stored: user.password });
        
        if (user.password !== hashedPassword) {
          throw new Error("Invalid credentials");
        }

        // After successful login, call success callback
        onAuthSuccess({ 
          userId: user.id,
          discordUsername: user.discord_username,
          playerName: user.player_name,
          chainId: user.chain_id,
          action: "login" 
        });
      }

      onClose();
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          {authType === "register" ? "Register" : "Login"}
        </h2>
        
        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="discordUsername" className={styles.label}>
              Discord Username
            </label>
            <input
              type="text"
              id="discordUsername"
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Processing..." : authType === "register" ? "Register" : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;