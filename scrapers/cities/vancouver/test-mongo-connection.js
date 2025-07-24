/**
 * MongoDB Connection Tester
 * 
 * This script tests MongoDB connection with different configurations and options
 * to help diagnose authentication issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URIs to test
const uris = [
  process.env.MONGODB_URI || 'mongodb+srv://discovr-api:apipassword123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr',
  // Try without appName parameter
  'mongodb+srv://discovr-api:apipassword123@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority',
  // Try with a different database name
  'mongodb+srv://discovr-api:apipassword123@discovr.vzlnmqb.mongodb.net/discovr?retryWrites=true&w=majority',
  // Try with a different authentication mechanism 
  'mongodb+srv://discovr-api:apipassword123@discovr.vzlnmqb.mongodb.net/?authMechanism=SCRAM-SHA-1&retryWrites=true&w=majority',
];

// Connection options variations
const optionsList = [
  // Standard options
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  // With explicit authSource
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: 'admin'
  },
  // With authentication mechanism specified
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authMechanism: 'SCRAM-SHA-1'
  }
];

// Test connection with all URI and options combinations
async function testConnections() {
  console.log('🔍 MongoDB Connection Tester');
  console.log('============================');
  
  let successfulConnection = false;
  
  // Try each URI with each options set
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    const safeUri = uri.replace(/:([^:@]+)@/, ':***@'); // Hide password in logs
    
    console.log(`\n🔄 Testing URI ${i+1}/${uris.length}: ${safeUri}`);
    
    for (let j = 0; j < optionsList.length; j++) {
      const options = optionsList[j];
      
      console.log(`\n  ⚙️ Testing with options set ${j+1}/${optionsList.length}: ${JSON.stringify(options)}`);
      
      try {
        // Attempt connection
        await mongoose.connect(uri, options);
        
        // If we reach here, connection was successful
        console.log(`\n  ✅ CONNECTION SUCCESSFUL with URI ${i+1} and options set ${j+1}`);
        console.log(`     URI: ${safeUri}`);
        console.log(`     Options: ${JSON.stringify(options)}`);
        
        // Log database name if available
        if (mongoose.connection.db) {
          const dbName = mongoose.connection.db.databaseName || 'unknown';
          console.log(`     Database name: ${dbName}`);
        }
        
        successfulConnection = true;
        
        // Close the connection
        await mongoose.connection.close();
        console.log('     Connection closed');
        
        // Break the loop if we found a working connection
        break;
      } catch (error) {
        console.log(`  ❌ Connection failed: ${error.message}`);
        console.log(`     Error name: ${error.name}`);
        console.log(`     Error code: ${error.code || 'undefined'}`);
        
        if (mongoose.connection) {
          // Close connection if it's open
          try {
            await mongoose.connection.close();
          } catch (e) {
            // Ignore errors closing connection
          }
        }
      }
    }
    
    // If we found a working connection, break the outer loop
    if (successfulConnection) {
      break;
    }
  }
  
  if (!successfulConnection) {
    console.log('\n❗ All connection attempts failed');
    console.log('\n🔍 Troubleshooting tips:');
    console.log('  1. Verify username and password are correct');
    console.log('  2. Ensure IP whitelist in MongoDB Atlas includes 0.0.0.0/0 for testing');
    console.log('  3. Check that the database user has appropriate roles assigned');
    console.log('  4. Verify the cluster name and region in the connection string');
  }
  
  process.exit(successfulConnection ? 0 : 1);
}

// Run the tests
testConnections().catch(err => {
  console.error('Test harness error:', err);
  process.exit(1);
});
