const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create or open the database
const db = new sqlite3.Database(path.join(__dirname, 'users.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      player_name TEXT,
      chain_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table ready.');
      }
    });
  }
});

module.exports = db;