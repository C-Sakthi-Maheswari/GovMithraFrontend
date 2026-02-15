const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const db = new Database('govmithra.db');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    age INTEGER,
    gender TEXT,
    caste TEXT,
    city TEXT,
    state TEXT,
    occupation TEXT,
    income_range TEXT,
    education_level TEXT,
    marital_status TEXT,
    disability TEXT,
    ration_card_type TEXT,
    land_ownership TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Signup endpoint
app.post('/api/signup', (req, res) => {
  const { email, password, name } = req.body;

  try {
    const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
    const result = stmt.run(email, password, name);
    
    res.json({ 
      success: true, 
      userId: result.lastInsertRowid,
      message: 'User created successfully' 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?');
    const user = stmt.get(email, password);

    if (user) {
      // Check if profile exists
      const profileStmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
      const profile = profileStmt.get(user.id);

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        hasProfile: !!profile,
        profile: profile || null
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Save/Update user profile
app.post('/api/profile', (req, res) => {
  const { 
    userId, 
    age, 
    gender, 
    caste, 
    city, 
    state, 
    occupation, 
    incomeRange, 
    educationLevel,
    maritalStatus,
    disability,
    rationCardType,
    landOwnership
  } = req.body;

  try {
    const checkStmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
    const existingProfile = checkStmt.get(userId);

    if (existingProfile) {
      // Update existing profile
      const updateStmt = db.prepare(`
        UPDATE user_profiles 
        SET age = ?, gender = ?, caste = ?, city = ?, state = ?, 
            occupation = ?, income_range = ?, education_level = ?,
            marital_status = ?, disability = ?, ration_card_type = ?,
            land_ownership = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      updateStmt.run(age, gender, caste, city, state, occupation, incomeRange, 
                     educationLevel, maritalStatus, disability, rationCardType, 
                     landOwnership, userId);
    } else {
      // Insert new profile
      const insertStmt = db.prepare(`
        INSERT INTO user_profiles 
        (user_id, age, gender, caste, city, state, occupation, income_range, 
         education_level, marital_status, disability, ration_card_type, land_ownership)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(userId, age, gender, caste, city, state, occupation, incomeRange,
                     educationLevel, maritalStatus, disability, rationCardType, landOwnership);
    }

    res.json({ success: true, message: 'Profile saved successfully' });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user profile
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const stmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
    const profile = stmt.get(userId);

    if (profile) {
      res.json({ success: true, profile });
    } else {
      res.status(404).json({ success: false, message: 'Profile not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});