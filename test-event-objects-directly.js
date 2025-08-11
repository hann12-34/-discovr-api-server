/**
 * TEST: Event Objects Directly (Pre-Database)
 * 
 * Examines the actual event objects created by scrapers
 * before any database operations or duplicate detection
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function testEventObjectsDirectly() {
  console.log('🔬 TESTING EVENT OBJECTS DIRECTLY (PRE-DATABASE)');
  console.log('='.repeat(60));
  
  // Test ROM scraper as it was working
  const scraperPath = path.join(TORONTO_DIR, 'scrape-rom-events-clean.js');
  
  try {
    console.log('🔍 Reading ROM scraper source code to find event creation...');
    
    const content = fs.readFileSync(scraperPath, 'utf8');
    
    // Find where the formattedEvent object is created
    const eventObjectMatch = content.match(/const formattedEvent = \{[\s\S]*?\};/);
    
    if (eventObjectMatch) {
      console.log('📋 Found formattedEvent object creation:');
      console.log('='.repeat(40));
      console.log(eventObjectMatch[0]);
      console.log('='.repeat(40));
      
      // Check if venue field is set to venue.name
      if (eventObjectMatch[0].includes('venue: venue.name')) {
        console.log('✅ VENUE FIX CONFIRMED: venue field uses venue.name');
      } else if (eventObjectMatch[0].includes('venue: venue,')) {
        console.log('❌ VENUE FIX NEEDED: venue field still uses venue object');
      } else {
        console.log('⚠️ VENUE FIELD: Could not determine venue field assignment');
      }
      
      // Check venue function
      const venueFunction = content.match(/const get\w*Venue = \(city\) => \(\{[\s\S]*?\}\);/);
      if (venueFunction) {
        console.log('\n🏢 Found venue function:');
        console.log('='.repeat(40));
        console.log(venueFunction[0]);
        console.log('='.repeat(40));
        
        // Extract venue name
        const nameMatch = venueFunction[0].match(/name: '([^']+)'/);
        if (nameMatch) {
          console.log(`✅ VENUE NAME FOUND: "${nameMatch[1]}"`);
        } else {
          console.log('❌ VENUE NAME: Could not extract venue name');
        }
      }
      
    } else {
      console.log('❌ Could not find formattedEvent object in scraper');
    }
    
    console.log('\n🎯 THEORETICAL TEST: What would a ROM event look like?');
    console.log('If our fixes work, a ROM event should have:');
    console.log('   📍 Venue: "Royal Ontario Museum"');
    console.log('   🔗 Source: actual ROM URL');
    console.log('   🏢 City: "Toronto, ON"');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  console.log('\n🏁 DIRECT EVENT OBJECT TEST COMPLETE');
}

// Run the test
testEventObjectsDirectly().catch(console.error);
