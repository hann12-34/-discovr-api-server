/**
 * Script to prepare deployment for Render
 * - Verifies all scrapers are correctly formatted
 * - Creates a deployment report
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Get MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function prepareDeployment() {
  console.log('🚀 Preparing deployment for Render...');
  const report = {
    date: new Date().toISOString(),
    environment: {},
    database: {},
    scrapers: {},
    deployment: {},
    recommendations: []
  };
  
  // Check environment variables
  report.environment.variables = {
    MONGODB_URI: uri ? '✅ Set' : '❌ Missing'
  };
  
  // Connect to MongoDB
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    report.database.connection = '✅ Successful';
    
    // Check database stats
    const database = client.db();
    const eventsCollection = database.collection('events');
    
    const totalEvents = await eventsCollection.countDocuments();
    report.database.totalEvents = totalEvents;
    
    // Check events by city
    const cities = ['Toronto', 'Vancouver', 'Montreal', 'Calgary'];
    report.database.eventsByCity = {};
    
    for (const city of cities) {
      const count = await eventsCollection.countDocuments({ city });
      report.database.eventsByCity[city] = count;
      
      // Add recommendation if city has no events
      if (count === 0) {
        report.recommendations.push(`⚠️ No events found for ${city}. Consider adding scrapers or events for this city.`);
      }
    }
    
    // Check venue structure
    const stringVenues = await eventsCollection.countDocuments({
      venue: { $type: 'string' }
    });
    
    report.database.eventsWithStringVenue = stringVenues;
    
    if (stringVenues > 0) {
      report.recommendations.push(`⚠️ Found ${stringVenues} events with venue as string. Run fix-venue-structure-for-swift-app.js to fix.`);
    }
    
    // Check scraper files
    const scrapersDir = path.join(__dirname, 'scrapers', 'cities');
    report.scrapers.directories = fs.readdirSync(scrapersDir);
    
    // Check Toronto scraper specifically
    const torontoScraperPath = path.join(scrapersDir, 'Toronto', 'toronto-events.js');
    report.scrapers.torontoScraper = fs.existsSync(torontoScraperPath) 
      ? '✅ Present' 
      : '❌ Missing';
    
    // Generate deployment recommendations
    if (totalEvents < 1000) {
      report.recommendations.push('⚠️ Total events count is low. Consider adding more events before deployment.');
    }
    
    if (report.database.eventsByCity.Toronto < 5) {
      report.recommendations.push('⚠️ Toronto has few events. Run Toronto scrapers to add more events.');
    }
    
    // Deployment status
    report.deployment.readyToDeploy = stringVenues === 0 
      ? '✅ Ready for deployment' 
      : '❌ Fix issues before deployment';
    
    // Save report to file
    const reportPath = path.join(__dirname, 'deployment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Deployment Report Summary:');
    console.log(`- Total Events: ${totalEvents}`);
    console.log('- Events by City:');
    for (const [city, count] of Object.entries(report.database.eventsByCity)) {
      console.log(`  - ${city}: ${count}`);
    }
    
    if (stringVenues > 0) {
      console.log(`\n⚠️ WARNING: Found ${stringVenues} events with venue as string. This will cause the Swift app to crash.`);
      console.log('Run: node fix-venue-structure-for-swift-app.js');
    } else {
      console.log('\n✅ All events have proper venue structure.');
    }
    
    console.log('\n📋 Recommendations:');
    report.recommendations.forEach(rec => console.log(`- ${rec}`));
    
    const deploymentStatus = stringVenues === 0 ? '✅ READY FOR DEPLOYMENT' : '❌ FIXES REQUIRED BEFORE DEPLOYMENT';
    console.log(`\n🚀 Deployment Status: ${deploymentStatus}`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error preparing deployment:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the preparation
prepareDeployment().catch(console.error);
