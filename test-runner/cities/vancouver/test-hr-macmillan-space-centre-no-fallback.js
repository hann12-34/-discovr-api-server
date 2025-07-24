/**
 * Test script for H.R. MacMillan Space Centre Events No-Fallback scraper
 *
 * This script runs the H.R. MacMillan Space Centre Events No-Fallback scraper and outputs the results
 */

const SpaceCentreEvents = require('./hrMacmillanSpaceCentreEventsNoFallback');

/**
 * Main test function
 */
async function testSpaceCentreEvents() {
  console.log('======================================');
  console.log('🧪 TESTING H.R. MACMILLAN SPACE CENTRE EVENTS SCRAPER (NO-FALLBACK)');
  console.log('======================================');
  console.log('Starting test...');
  
  const startTime = new Date();
  
  try {
    // Run the scraper
    console.log('Running scraper...');
    const events = await SpaceCentreEvents.scrape();
    
    // Calculate elapsed time
    const endTime = new Date();
    const elapsedSeconds = (endTime - startTime) / 1000;
    
    // Output results
    console.log('\n======================================');
    console.log(`✅ Test completed in ${elapsedSeconds.toFixed(2)} seconds`);
    console.log(`📊 Found ${events.length} events`);
    console.log('======================================\n');
    
    // Display each event
    if (events.length > 0) {
      console.log('📋 EVENT DETAILS:');
      events.forEach((event, index) => {
        console.log(`\n--- EVENT ${index + 1} ---`);
        console.log(`Title: ${event.title}`);
        console.log(`Description: ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}`);
        console.log(`Start Date: ${event.startDate.toLocaleString()}`);
        if (event.endDate) {
          console.log(`End Date: ${event.endDate.toLocaleString()}`);
        }
        console.log(`URL: ${event.url}`);
        console.log(`Venue: ${event.venue.name}, ${event.venue.address}`);
        console.log(`Source ID: ${event.sourceIdentifier}`);
        console.log(`Unique ID: ${event.uniqueId}`);
        if (event.isExhibition) {
          console.log('Type: Exhibition');
        }
        if (event.isShow) {
          console.log('Type: Planetarium Show');
        }
        if (event.categories && event.categories.length > 0) {
          console.log(`Categories: ${event.categories.join(', ')}`);
        }
      });
    } else {
      console.log('⚠️ No events found');
      console.log('This could be normal if there are genuinely no events, as we have a strict no-fallback policy.');
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testSpaceCentreEvents();
