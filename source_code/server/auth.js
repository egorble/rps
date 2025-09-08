const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { discordUsername, password } = req.body;
    
    if (!discordUsername || !password) {
      return res.status(400).json({ error: 'Discord username and password are required' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Use discordUsername as playerName
    const playerName = discordUsername;
    
    // Initially set chainId as null, it will be set after chain creation
    const chainId = null;
    
    // Insert user into database
    const query = `INSERT INTO users (discord_username, password, player_name, chain_id) VALUES (?, ?, ?, ?)`;
    db.run(query, [discordUsername, hashedPassword, playerName, chainId], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Discord username already exists' });
        }
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.status(201).json({ 
        message: 'User registered successfully',
        userId: this.lastID,
        discordUsername,
        playerName,
        chainId
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { discordUsername, password } = req.body;
    
    if (!discordUsername || !password) {
      return res.status(400).json({ error: 'Discord username and password are required' });
    }
    
    // Find user in database
    const query = `SELECT * FROM users WHERE discord_username = ?`;
    db.get(query, [discordUsername], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Compare passwords
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json({ 
        message: 'Login successful',
        userId: user.id,
        discordUsername: user.discord_username,
        playerName: user.player_name,
        chainId: user.chain_id
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by discord username
router.get('/user/:discordUsername', (req, res) => {
  try {
    const { discordUsername } = req.params;
    
    const query = `SELECT id, discord_username, player_name, chain_id FROM users WHERE discord_username = ?`;
    db.get(query, [discordUsername], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user chain ID
router.post('/user/:discordUsername/chain', (req, res) => {
  try {
    const { discordUsername } = req.params;
    const { chainId } = req.body;
    
    if (!chainId) {
      return res.status(400).json({ error: 'Chain ID is required' });
    }
    
    const query = `UPDATE users SET chain_id = ? WHERE discord_username = ?`;
    db.run(query, [chainId, discordUsername], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'Chain ID updated successfully' });
    });
  } catch (error) {
    console.error('Update chain ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;