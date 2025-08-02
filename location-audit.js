const mongoose = require('mongoose');
const Event = require('./models/Event');

async function auditLocationData() {
  try {
    await mongoose.connect('mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr');
    console.log('🔌 Connected to MongoDB');
    
    // Get all events with location data
    const events = await Event.find({
      $or: [
        { latitude: { $exists: true } },
        { longitude: { $exists: true } },
        { 'venue.location.coordinates': { $exists: true } },
        { streetAddress: { $exists: true } },
        { 'venue.address': { $exists: true } }
      ]
    }).select('title city venue latitude longitude streetAddress location').limit(100);
    
    console.log(`\n📊 LOCATION DATA AUDIT - Found ${events.length} events with location data:`);
    console.log('='.repeat(80));
    
    const cityStats = {};
    const issueEvents = [];
    
    events.forEach((event, i) => {
      const city = event.city || 'Unknown';
      if (!cityStats[city]) cityStats[city] = { total: 0, withCoords: 0, withAddress: 0, issues: 0 };
      cityStats[city].total++;
      
      const lat = event.latitude || (event.venue?.location?.coordinates ? event.venue.location.coordinates[1] : 0);
      const lon = event.longitude || (event.venue?.location?.coordinates ? event.venue.location.coordinates[0] : 0);
      const address = event.venue?.address || event.streetAddress || 'No address';
      const venue = event.venue?.name || event.location || 'Unknown venue';
      
      // Check for issues
      const hasCoords = lat !== 0 && lon !== 0;
      const hasAddress = address !== 'No address';
      const coordsLookInvalid = (lat === 0 && lon === 0) || Math.abs(lat) < 10 || Math.abs(lon) < 10;
      
      if (hasCoords) cityStats[city].withCoords++;
      if (hasAddress) cityStats[city].withAddress++;
      
      if (coordsLookInvalid && hasAddress) {
        cityStats[city].issues++;
        issueEvents.push({
          city,
          title: event.title,
          venue,
          address,
          coords: [lat, lon]
        });
      }
      
      if (i < 15) {  // Show first 15 in detail
        console.log(`${i+1}. ${event.title}`);
        console.log(`   City: ${city}`);
        console.log(`   Venue: ${venue}`);
        console.log(`   Address: ${address}`);
        console.log(`   Coords: [${lat}, ${lon}] ${coordsLookInvalid ? '⚠️ INVALID' : '✅'}`);
        console.log('---');
      }
    });
    
    console.log(`\n📈 CITY STATISTICS:`);
    Object.entries(cityStats).forEach(([city, stats]) => {
      const pctCoords = ((stats.withCoords / stats.total) * 100).toFixed(1);
      const pctAddress = ((stats.withAddress / stats.total) * 100).toFixed(1);
      console.log(`${city}: ${stats.total} events, ${pctCoords}% with coords, ${pctAddress}% with address, ${stats.issues} issues`);
    });
    
    if (issueEvents.length > 0) {
      console.log(`\n🚨 LOCATION ISSUES FOUND (${issueEvents.length}):`);
      issueEvents.forEach((issue, i) => {
        console.log(`${i+1}. ${issue.title} (${issue.city})`);
        console.log(`   ${issue.venue} - ${issue.address}`);
        console.log(`   Invalid coords: ${issue.coords}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

auditLocationData();
