/**
 * Script to check available users in the database
 * Run with: node scripts/check-users.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Check if User model exists
try {
  fs.accessSync('./models/User.js', fs.constants.F_OK);
  const User = require('../models/User');
  
  async function checkUsers() {
    try {
      // Connect to MongoDB
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
      
      // Find users
      console.log('\nFinding users...');
      const users = await User.find().select('-password');
      
      if (users.length === 0) {
        console.log('No users found in the database.');
      } else {
        console.log(`Found ${users.length} users:`);
        users.forEach((user, index) => {
          console.log(`\n--- User ${index + 1} ---`);
          console.log(`Email: ${user.email}`);
          console.log(`Role: ${user.role || 'N/A'}`);
          console.log(`Name: ${user.name || 'N/A'}`);
        });
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
  checkUsers();
} catch (err) {
  console.log('User model not found. Creating a test API key script instead.');
  
  // If User model doesn't exist, create a script to check API keys
  async function checkApiKeys() {
    try {
      // Connect to MongoDB
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
      
      // Try to find API key collections
      console.log('\nChecking for API key collections...');
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      const apiKeyCollections = collections.filter(col => 
        col.name.toLowerCase().includes('key') || 
        col.name.toLowerCase().includes('api') || 
        col.name.toLowerCase().includes('auth')
      );
      
      if (apiKeyCollections.length === 0) {
        console.log('No API key related collections found.');
      } else {
        console.log('Possible API key collections:');
        for (const col of apiKeyCollections) {
          console.log(`- ${col.name}`);
          
          // Try to get some sample documents
          const docs = await mongoose.connection.db.collection(col.name).find().limit(5).toArray();
          if (docs.length > 0) {
            console.log(`  Sample documents: ${JSON.stringify(docs, null, 2)}`);
          } else {
            console.log('  No documents found in this collection');
          }
        }
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
  checkApiKeys();
}
