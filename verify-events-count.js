/**
 * Event Count Verification Script
 * 
 * This script connects to both the cloud API and our local proxy API
 * and directly compares the number of events returned by each.
 */

const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');
const fs = require('fs').promises;

// Configuration
const CLOUD_API_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1/venues/events/all';
const LOCAL_PROXY_URL = 'http://localhost:3050/api/v1/venues/events/all';
const CLOUD_MONGODB_URI = "mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr";

async function main() {
  console.log('🔍 Event Count Verification');
  console.log('===========================\n');
  
  try {
    // Create MongoDB client
    const client = new MongoClient(CLOUD_MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    console.log('🌐 Testing Cloud API...');
    try {
      const cloudResponse = await axios.get(CLOUD_API_URL, {
        headers: { 
          'Accept': 'application/json',
          'X-Disable-HTTP3': 'true'
        }
      });
      
      console.log(`✅ Cloud API returned ${cloudResponse.data.length} events`);
      console.log(`📊 Data size: ${JSON.stringify(cloudResponse.data).length} bytes`);
      await fs.writeFile('./cloud-api-events.json', JSON.stringify(cloudResponse.data, null, 2));
      console.log('📝 Cloud events saved to cloud-api-events.json');
    } catch (error) {
      console.error(`❌ Cloud API error: ${error.message}`);
    }

    console.log('\n🔌 Testing Local Proxy API...');
    try {
      const proxyResponse = await axios.get(LOCAL_PROXY_URL);
      console.log(`✅ Local Proxy returned ${proxyResponse.data.length} events`);
      console.log(`📊 Data size: ${JSON.stringify(proxyResponse.data).length} bytes`);
      await fs.writeFile('./proxy-api-events.json', JSON.stringify(proxyResponse.data, null, 2));
      console.log('📝 Proxy events saved to proxy-api-events.json');
    } catch (error) {
      console.error(`❌ Local Proxy error: ${error.message}`);
    }

    console.log('\n📊 Connecting directly to MongoDB...');
    try {
      await client.connect();
      console.log('✅ Connected to MongoDB');
      
      const db = client.db('discovr');
      const eventsCollection = db.collection('events');
      
      const events = await eventsCollection.find({}).toArray();
      console.log(`✅ MongoDB has ${events.length} events`);
      console.log(`📊 Data size: ${JSON.stringify(events).length} bytes`);
      await fs.writeFile('./mongodb-direct-events.json', JSON.stringify(events, null, 2));
      console.log('📝 MongoDB events saved to mongodb-direct-events.json');
    } catch (error) {
      console.error(`❌ MongoDB error: ${error.message}`);
    } finally {
      await client.close();
    }

    console.log('\n📱 To fix the app, try these options:');
    console.log('1. Make sure your proxy server is running on port 3050');
    console.log('2. Update DiscovrConfig.swift to point to your proxy:');
    console.log('   static let apiBaseURL = "http://localhost:3050"');
    console.log('3. Configure iOS network settings to use a proxy:');
    console.log('   Settings > Wi-Fi > [Network Name] > Configure Proxy > Manual');
    console.log('   Server: localhost, Port: 3050');
    console.log('4. Rebuild the app completely after changes');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

main().catch(console.error);
