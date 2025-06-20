/**
 * Script to create an initial admin user
 * Run with: node scripts/createAdminUser.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Admin user details - customize these
const adminUser = {
  username: 'admin',
  email: 'admin@discovr.com',
  password: 'Admin123!',  // Change this in production
  role: 'admin'
};

async function createAdminUser() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username: adminUser.username },
        { email: adminUser.email }
      ]
    });

    if (existingUser) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create new admin user
    const user = new User(adminUser);
    await user.save();

    console.log('Admin user created successfully');
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${adminUser.password}`);
    console.log('Please change this password after first login.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();
