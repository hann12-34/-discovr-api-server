/**
 * MongoDB Connection Tester v2
 * 
 * Tests various credential combinations to find a working connection
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Possible usernames and passwords to try
const credentials = [
  { username: 'masteraccount', password: 'password123' },
  { username: 'discovr-api', password: 'apipassword123' },
  { username: 'masteraccount', password: 'masterpassword' },
  { username: 'admin', password: 'admin123' },
  { username: 'discovr', password: 'discovrpassword' }
];

// Possible database names
const dbNames = ['discovr-events', 'discovr', 'test', ''];

// Connection options
const options = {
  serverSelectionTimeoutMS: 5000, // Shorter timeout for testing
  retryWrites: true,
  w: 'majority'
};

async function testConnection() {
  console.log('🔍 MongoDB Connection Tester v2');
  console.log('==============================');
  
  let success = false;
  
  for (const cred of credentials) {
    for (const dbName of dbNames) {
      const dbPart = dbName ? `/${dbName}` : '';
      const uri = `mongodb+srv://${cred.username}:${cred.password}@discovr.vzlnmqb.mongodb.net${dbPart}?retryWrites=true&w=majority`;
      const maskedUri = uri.replace(/:([^:@]+)@/, ':***@');
      
      console.log(`\nTrying: ${maskedUri}`);
      
      try {
        console.log(`Connecting with ${cred.username}:****${cred.password.substring(cred.password.length-2)} to ${dbName || 'default db'}`);
        await mongoose.connect(uri, options);
        
        // Connection succeeded
        console.log('\n✅ CONNECTION SUCCESSFUL!');
        console.log(`Username: ${cred.username}`);
        console.log(`Database: ${dbName || 'default'}`);
        console.log(`Connection URI: ${maskedUri}`);
        
        // Get database info if available
        if (mongoose.connection.db) {
          const dbInfo = mongoose.connection.db.databaseName || 'unknown';
          console.log(`Connected database name: ${dbInfo}`);
        }
        
        success = true;
        await mongoose.connection.close();
        break;
      } catch (error) {
        console.log(`❌ ${error.name}: ${error.message}`);
        if (mongoose.connection) {
          try {
            await mongoose.connection.close();
          } catch (e) {} // Ignore close errors
        }
      }
    }
    
    if (success) break;
  }
  
  if (!success) {
    console.log('\n❌ All connection attempts failed');
    console.log('Possible issues:');
    console.log('1. None of the tested credentials are correct');
    console.log('2. IP whitelist restrictions in MongoDB Atlas');
    console.log('3. Network connectivity issues');
  }
  
  process.exit(success ? 0 : 1);
}

testConnection().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
