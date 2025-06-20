/**
 * Script to create an API key for testing
 * Run with: node scripts/create-api-key.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Create APIKey model if it doesn't exist
const APIKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  lastUsedAt: {
    type: Date
  }
});

async function createAPIKey() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check if the model exists in the connection
    let APIKey;
    try {
      APIKey = mongoose.model('APIKey');
    } catch (error) {
      APIKey = mongoose.model('APIKey', APIKeySchema);
    }
    
    // Generate a new API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    // Create expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Create the API key in the database
    const newKey = new APIKey({
      key: apiKey,
      name: 'Test API Key',
      expiresAt: expiresAt
    });
    
    await newKey.save();
    
    console.log('\nAPI Key created successfully:');
    console.log(`Key: ${apiKey}`);
    console.log(`Expires: ${expiresAt}`);
    
    // Save the API key to a local file for convenience
    const apiKeyFile = path.join(__dirname, 'api-key.txt');
    fs.writeFileSync(apiKeyFile, `API_KEY=${apiKey}\n`);
    console.log(`\nAPI key saved to: ${apiKeyFile}`);
    
    // Add the API key to .env file if it exists
    const envFile = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envFile)) {
      let envContent = fs.readFileSync(envFile, 'utf8');
      
      // Remove existing API_KEY line if it exists
      envContent = envContent.replace(/^API_KEY=.*$/m, '');
      
      // Add the new API_KEY
      envContent += `\nAPI_KEY=${apiKey}\n`;
      
      fs.writeFileSync(envFile, envContent);
      console.log('API key added to .env file');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createAPIKey();
