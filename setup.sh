#!/bin/bash

# Discovr API Server Setup Script
# This script helps set up the Discovr API server environment

echo "==== Discovr API Server Setup ===="
echo "Setting up the environment for Discovr API Server"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if MongoDB is running locally
echo "Checking MongoDB connection..."
if ! command -v mongod &> /dev/null; then
    echo "WARNING: MongoDB is not installed locally."
    echo "Make sure you have MongoDB running either locally or at the URI specified in your .env file."
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file with default configuration..."
    cat > .env << EOL
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/discovr

# API Security
API_KEY=change_this_to_a_secure_random_string
JWT_SECRET=change_this_to_a_secure_random_string

# Server Configuration
PORT=3000
EOL
    echo ".env file created. IMPORTANT: Please update the API_KEY and JWT_SECRET with secure values."
else
    echo ".env file already exists."
fi

# Create admin user script
echo "Creating script to add admin user..."
cat > create-admin.js << EOL
/**
 * Script to create an admin user
 * Run with: node create-admin.js username email password
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Check arguments
if (process.argv.length < 5) {
  console.log('Usage: node create-admin.js <username> <email> <password>');
  process.exit(1);
}

const username = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Define User schema (simplified version for this script)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

// Hash the password before saving
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Create model
const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: username },
        { email: email }
      ]
    });

    if (existingUser) {
      console.log('User already exists with this username or email.');
      process.exit(0);
    }

    // Create new admin user
    const user = new User({
      username: username,
      email: email,
      password: password,
      role: 'admin'
    });
    
    await user.save();

    console.log('Admin user created successfully');
    console.log(\`Username: \${username}\`);
    console.log('Password: [hidden for security]');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();
EOL

echo "Setup complete!"
echo "To start the server, run: npm start"
echo "To create an admin user, run: node create-admin.js <username> <email> <password>"
echo ""
echo "IMPORTANT: Before deploying to production, make sure to:"
echo "1. Update the MongoDB URI in the .env file"
echo "2. Set secure values for API_KEY and JWT_SECRET"
echo "3. Create an admin user with a strong password"
