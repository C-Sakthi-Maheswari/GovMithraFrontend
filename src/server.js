const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
let db;

async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, 'govmithra.db'),
    driver: sqlite3.Database
  });

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create profiles table
  await db.exec(`
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
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  console.log('✅ Database initialized successfully');
}

// Initialize database on startup
initDatabase().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// Sign up
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    console.log(`✅ New user registered: ${email}`);

    res.json({
      success: true,
      userId: result.lastID,
      message: 'Registration successful'
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if profile exists
    const profile = await db.get('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      hasProfile: !!profile,
      profile: profile || null
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.json({
      success: false,
      message: 'Login failed'
    });
  }
});

// ==========================================
// PROFILE ENDPOINTS
// ==========================================

// Save or update profile
app.post('/api/profile', async (req, res) => {
  try {
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

    if (!userId) {
      return res.json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if profile exists
    const existingProfile = await db.get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

    if (existingProfile) {
      // Update existing profile
      await db.run(`
        UPDATE user_profiles SET
          age = ?,
          gender = ?,
          caste = ?,
          city = ?,
          state = ?,
          occupation = ?,
          income_range = ?,
          education_level = ?,
          marital_status = ?,
          disability = ?,
          ration_card_type = ?,
          land_ownership = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [age, gender, caste, city, state, occupation, incomeRange, educationLevel,
          maritalStatus, disability, rationCardType, landOwnership, userId]);

      console.log(`✅ Profile updated for user ID: ${userId}`);
    } else {
      // Insert new profile
      await db.run(`
        INSERT INTO user_profiles (
          user_id, age, gender, caste, city, state, occupation,
          income_range, education_level, marital_status, disability,
          ration_card_type, land_ownership
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, age, gender, caste, city, state, occupation, incomeRange,
          educationLevel, maritalStatus, disability, rationCardType, landOwnership]);

      console.log(`✅ Profile created for user ID: ${userId}`);
    }

    res.json({
      success: true,
      message: 'Profile saved successfully'
    });

  } catch (error) {
    console.error('❌ Profile save error:', error);
    res.json({
      success: false,
      message: 'Failed to save profile'
    });
  }
});

// Get profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await db.get('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

    if (!profile) {
      return res.json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    res.json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// ==========================================
// RASA INTEGRATION
// ==========================================

// Health check for Rasa
app.get('/api/health/rasa', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5005/', { timeout: 5000 });
    res.json({
      status: 'success',
      message: 'Rasa server is running',
      version: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Rasa server is not responding',
      error: error.message
    });
  }
});

// Health check for Actions
app.get('/api/health/actions', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:5055/health', { timeout: 5000 });
    res.json({
      status: 'success',
      message: 'Action server is running'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Action server is not responding',
      error: error.message
    });
  }
});

// Chat endpoint - forwards messages to Rasa
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sender, metadata } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    console.log(`\n📨 Incoming message from ${sender}:`);
    console.log(`   Message: "${message}"`);
    console.log(`   Language: ${metadata?.language || 'en'}`);
    console.log(`   Profile: ${metadata?.userProfile ? 'Yes' : 'No'}`);

    // Forward to Rasa webhook
    const rasaResponse = await axios.post(
      'http://localhost:5005/webhooks/rest/webhook',
      {
        sender: sender || 'anonymous',
        message: message,
        metadata: metadata || {}
      },
      {
        timeout: 30000, // 30 second timeout for processing
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Rasa responded with ${rasaResponse.data.length} message(s)`);

    res.json({
      success: true,
      messages: rasaResponse.data
    });

  } catch (error) {
    console.error('❌ Chat error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Chatbot service is unavailable. Please ensure Rasa is running.',
        error: 'CONNECTION_REFUSED'
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        message: 'Chatbot took too long to respond. Please try again.',
        error: 'TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process your message',
      error: error.message
    });
  }
});

// ==========================================
// SERVER STARTUP
// ==========================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 GovMithra Backend Server');
  console.log('='.repeat(60));
  console.log(`\n📡 Server running on: http://localhost:${PORT}`);
  console.log('\n🔗 Endpoints:');
  console.log(`   Authentication:`);
  console.log(`     POST http://localhost:${PORT}/api/signup`);
  console.log(`     POST http://localhost:${PORT}/api/login`);
  console.log(`   Profile:`);
  console.log(`     POST http://localhost:${PORT}/api/profile`);
  console.log(`     GET  http://localhost:${PORT}/api/profile/:userId`);
  console.log(`   Chat:`);
  console.log(`     POST http://localhost:${PORT}/api/chat`);
  console.log(`   Health Checks:`);
  console.log(`     GET  http://localhost:${PORT}/api/health/rasa`);
  console.log(`     GET  http://localhost:${PORT}/api/health/actions`);
  
  console.log('\n' + '='.repeat(60));
  console.log('⚙️  Required Services:');
  console.log('='.repeat(60));
  console.log('   ⚠️  Make sure these are running:');
  console.log('   1. Rasa server:  rasa run --enable-api --cors "*"');
  console.log('   2. Action server: rasa run actions');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down gracefully...');
  if (db) {
    await db.close();
  }
  process.exit(0);
});