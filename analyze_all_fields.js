const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyzeAllFields() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('discovr');
    const events = db.collection('events');
    
    console.log('=== COMPREHENSIVE FIELD ANALYSIS ===');
    
    const total = await events.countDocuments();
    console.log(`Total events: ${total}`);
    
    // Critical fields that might cause 422 errors
    const criticalFields = [
      'id', 'title', 'description', 'startDate', 'endDate', 'venue', 
      'location', 'price', 'categories', 'imageUrl', 'officialWebsite'
    ];
    
    for (const field of criticalFields) {
      console.log(`\n=== ${field.toUpperCase()} FIELD ANALYSIS ===`);
      
      // Missing field entirely
      const missing = await events.countDocuments({ [field]: { $exists: false } });
      console.log(`Missing ${field}: ${missing}`);
      
      // Null values
      const nullCount = await events.countDocuments({ [field]: null });
      console.log(`Null ${field}: ${nullCount}`);
      
      // Empty string
      const emptyCount = await events.countDocuments({ [field]: '' });
      console.log(`Empty ${field}: ${emptyCount}`);
      
      // Undefined
      const undefinedCount = await events.countDocuments({ [field]: undefined });
      console.log(`Undefined ${field}: ${undefinedCount}`);
      
      // Sample problematic entries
      const problematic = await events.find({
        $or: [
          { [field]: { $exists: false } },
          { [field]: null },
          { [field]: '' },
          { [field]: undefined }
        ]
      }).limit(3).toArray();
      
      if (problematic.length > 0) {
        console.log(`Sample problematic ${field} events:`);
        problematic.forEach((event, i) => {
          console.log(`  ${i+1}. ${event.title || 'No title'}: ${JSON.stringify(event[field])} (${typeof event[field]})`);
        });
      }
    }
    
    // Special analysis for venue object structure
    console.log('\n=== VENUE STRUCTURE ANALYSIS ===');
    const venuesWithIssues = await events.find({
      $or: [
        { 'venue': { $exists: false } },
        { 'venue.name': { $exists: false } },
        { 'venue.location': { $exists: false } },
        { 'venue.location.address': { $exists: false } },
        { 'venue.location.coordinates': { $exists: false } }
      ]
    }).limit(10).toArray();
    
    console.log(`Events with venue structure issues: ${venuesWithIssues.length}`);
    venuesWithIssues.forEach((event, i) => {
      console.log(`${i+1}. ${event.title || 'No title'}`);
      console.log(`   venue: ${JSON.stringify(event.venue)}`);
      console.log('   ---');
    });
    
    // Special analysis for location field (separate from venue)
    console.log('\n=== LOCATION FIELD DETAILED ANALYSIS ===');
    const locationTypes = await events.aggregate([
      { $group: { _id: { $type: "$location" }, count: { $sum: 1 } } }
    ]).toArray();
    console.log('Location field types:', locationTypes);
    
    // Sample events with different location structures
    const locationSamples = await events.find({}).limit(10).toArray();
    console.log('Sample location structures:');
    locationSamples.forEach((event, i) => {
      console.log(`${i+1}. ${event.title || 'No title'}: location = ${JSON.stringify(event.location)}`);
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
  } finally {
    await client.close();
  }
}

analyzeAllFields();
