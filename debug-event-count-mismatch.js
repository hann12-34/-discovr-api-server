// Debug script to identify why app shows 122 events vs 1053 in database
require('dotenv').config();
require('./temp-env-config');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { isValidEventTitle } = require('./scrapers/utils/navigationFilter');

const CLOUD_MONGODB_URI = process.env.MONGODB_URI;

async function debugEventCountMismatch() {
  const client = new MongoClient(CLOUD_MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    // 1. Check total events in database
    const totalEvents = await eventsCollection.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // 2. Get sample of events to check filtering
    const allEvents = await eventsCollection.find({}).toArray();
    console.log(`📋 Retrieved ${allEvents.length} events for analysis`);
    
    // 3. Test the isValidEventTitle filtering
    let validCount = 0;
    let invalidCount = 0;
    const invalidTitles = [];
    
    allEvents.forEach(event => {
      if (event && event.title) {
        if (isValidEventTitle(event.title)) {
          validCount++;
        } else {
          invalidCount++;
          invalidTitles.push(event.title);
        }
      } else {
        invalidCount++;
        invalidTitles.push('NO TITLE');
      }
    });
    
    console.log(`\n🔍 Event Title Filtering Results:`);
    console.log(`✅ Valid events: ${validCount}`);
    console.log(`❌ Filtered out events: ${invalidCount}`);
    console.log(`📈 Expected API response: ${validCount} events`);
    
    // 4. Show sample invalid titles
    console.log(`\n🚫 Sample filtered titles (first 10):`);
    invalidTitles.slice(0, 10).forEach((title, index) => {
      console.log(`   ${index + 1}. "${title}"`);
    });
    
    // 5. Check for null events during normalization simulation
    let nullEventsCreated = 0;
    allEvents.forEach(event => {
      if (event && event.title && typeof event.title === 'string') {
        const cleanedTitle = event.title.trim();
        if (!isValidEventTitle(cleanedTitle)) {
          nullEventsCreated++;
        }
      }
    });
    
    console.log(`\n💀 Events that would become null during normalization: ${nullEventsCreated}`);
    console.log(`🧮 Final expected count: ${totalEvents - nullEventsCreated}`);
    
    // 6. Check city distribution
    const cityStats = await eventsCollection.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log(`\n🌍 Events by city:`);
    cityStats.forEach(stat => {
      console.log(`   ${stat._id || 'Unknown'}: ${stat.count} events`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugEventCountMismatch().catch(console.error);
