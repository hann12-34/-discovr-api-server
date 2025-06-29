// Modified server.js MongoDB connection with better error handling
// Run this locally to test MongoDB connection

require('dotenv').config();
const mongoose = require('mongoose');

console.log('Testing MongoDB connection...');
console.log(`MongoDB URI format check: ${process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.substring(0, 20) + '...REDACTED...' : 
  'Not set in environment'}`);

const connectWithRetry = (retryCount = 0, maxRetries = 5) => {
  console.log(`MongoDB connection attempt ${retryCount + 1} of ${maxRetries}`);
  
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Increased timeout
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    heartbeatFrequencyMS: 20000, // Keep alive
    retryWrites: true,
    w: 'majority',
  })
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!');
    console.log('Database name:', mongoose.connection.db?.databaseName || 'unknown');
    
    try {
      if (mongoose.connection.db?.admin) {
        mongoose.connection.db.admin().serverInfo()
          .then(info => {
            console.log('MongoDB server version:', info.version);
          })
          .catch(e => {
            console.log('⚠️ Could not retrieve MongoDB server info:', e.message);
          });
      } else {
        console.log('⚠️ Warning: Admin database not available');
      }
    } catch (e) {
      console.log('⚠️ Error checking MongoDB server:', e.message);
    }
  })
  .catch(error => {
    console.log(`❌ MongoDB connection error: ${error.message}`);
    console.log(`Error name: ${error.name}`);
    console.log(`Error code: ${error.code || 'undefined'}`);
    
    // If network error or timeout, likely IP whitelist issue
    if (error.name === 'MongoNetworkError' || 
        error.message.includes('timeout') || 
        error.message.includes('ENOTFOUND')) {
      console.log('\n❗ LIKELY CAUSE: MongoDB Atlas network access restrictions');
      console.log('Cloud Run uses dynamic IPs that need to be allowed in MongoDB Atlas.');
      console.log('\nPROBLEM SOLUTION:');
      console.log('1. Log in to MongoDB Atlas');
      console.log('2. Go to Network Access');
      console.log('3. Add "Allow Access from Anywhere" (0.0.0.0/0) for testing');
      console.log('   (For production, use VPC peering or a more secure solution)');
    }
    
    if (retryCount < maxRetries) {
      console.log(`Retrying in 5 seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1, maxRetries), 5000);
    } else {
      console.log('Failed to connect to MongoDB after multiple attempts.');
      process.exit(1);
    }
  });
};

// Try connection
connectWithRetry();
