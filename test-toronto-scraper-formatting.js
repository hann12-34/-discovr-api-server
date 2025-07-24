/**
 * Test script to verify that the updated Toronto scraper is correctly formatting events
 * This will run the scrapers but NOT add events to the database - it just checks formatting
 */

const TorontoEventsOfficial = require('./scrapers/cities/Toronto/toronto-events');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function testTorontoScraper() {
  try {
    console.log('🔍 Testing Toronto scrapers with updated formatting...');
    
    // Initialize the Toronto events scraper
    const torontoScraper = new TorontoEventsOfficial();
    
    // Fetch events from Toronto
    console.log('\n📡 Fetching events from Toronto scraper...');
    const events = await torontoScraper.fetchEvents();
    
    console.log(`\n✅ Found ${events.length} Toronto events`);
    
    // Check formatting of events
    let correctlyFormatted = 0;
    let issuesFound = 0;
    
    console.log('\n📊 Checking event formatting:');
    
    events.forEach((event, index) => {
      console.log(`\n📝 Event ${index + 1}: ${event.name}`);
      
      let hasIssues = false;
      
      // Check name prefix
      if (!event.name.startsWith('Toronto - ')) {
        console.log(`  ❌ Name does not start with "Toronto - ": ${event.name}`);
        hasIssues = true;
      } else {
        console.log(`  ✅ Name has correct prefix: ${event.name}`);
      }
      
      // Check city field
      if (event.city !== 'Toronto') {
        console.log(`  ❌ Missing city="Toronto" field: ${event.city}`);
        hasIssues = true;
      } else {
        console.log(`  ✅ Has city="Toronto" field`);
      }
      
      // Check cityId field
      if (event.cityId !== 'Toronto') {
        console.log(`  ❌ Missing cityId="Toronto" field: ${event.cityId}`);
        hasIssues = true;
      } else {
        console.log(`  ✅ Has cityId="Toronto" field`);
      }
      
      // Check venue field (should be string)
      if (typeof event.venue !== 'string') {
        console.log(`  ❌ venue is not a string: ${typeof event.venue}`);
        hasIssues = true;
      } else if (event.venue !== 'Toronto') {
        console.log(`  ❌ venue is not "Toronto": ${event.venue}`);
        hasIssues = true;
      } else {
        console.log(`  ✅ venue is correctly set to "Toronto"`);
      }
      
      // Check location field
      if (!event.location || typeof event.location !== 'string' || !event.location.includes('Toronto')) {
        console.log(`  ❌ location field missing or doesn't include Toronto: ${event.location}`);
        hasIssues = true;
      } else {
        console.log(`  ✅ location includes Toronto: ${event.location}`);
      }
      
      if (hasIssues) {
        issuesFound++;
      } else {
        correctlyFormatted++;
      }
    });
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ ${correctlyFormatted} events correctly formatted`);
    console.log(`  ❌ ${issuesFound} events with formatting issues`);
    
    if (issuesFound === 0) {
      console.log('\n🎉 SUCCESS! All Toronto events are correctly formatted');
      console.log('Your scrapers are now ready to deploy to Render');
    } else {
      console.log('\n⚠️ Some formatting issues found. Review the scraper code to fix these issues.');
    }
    
  } catch (error) {
    console.error('❌ Error testing Toronto scraper:', error);
  }
}

// Run the test
testTorontoScraper().catch(console.error);
