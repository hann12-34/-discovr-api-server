/**
 * Integration test for Commodore Ballroom scraper
 * 
 * Tests:
 * - Scraper runs without syntax errors
 * - Events are successfully extracted
 * - Event data structure is correct and complete
 * - Dates are properly parsed
 */

const commodoreScraper = require('../scrapers/venues/commodoreBallroomShows');
const { scrapeLogger } = require('../scrapers/utils/logger');
const assert = require('assert').strict;

async function testCommodoreScraper() {
  console.log('Running Commodore Ballroom scraper tests...');
  
  try {
    // Test 1: Scraper runs without errors
    console.log('Test 1: Running scraper...');
    const events = await commodoreScraper.scrape();
    console.log(`✅ Test 1 Passed: Scraper executed without errors, found ${events.length} events`);
    
    // Test 2: Verify events were found
    console.log('\nTest 2: Verifying events extraction...');
    assert(Array.isArray(events), 'Events should be an array');
    assert(events.length > 0, 'At least one event should be found');
    console.log(`✅ Test 2 Passed: Found ${events.length} events`);
    
    // Test 3: Verify event data structure
    console.log('\nTest 3: Verifying event data structure...');
    const sampleEvent = events[0];
    
    // Check required fields
    assert(sampleEvent.title, 'Event should have a title');
    assert(sampleEvent.startDate instanceof Date, 'Event should have a valid start date');
    assert(sampleEvent.venue && sampleEvent.venue.name === 'Commodore Ballroom', 'Event should have venue information');
    assert(sampleEvent.url && sampleEvent.url.startsWith('http'), 'Event should have a valid URL');
    
    // Log sample data for verification
    console.log(`✅ Test 3 Passed: Event structure is valid`);
    console.log('\nSample event:');
    console.log(`Title: ${sampleEvent.title}`);
    console.log(`Date: ${sampleEvent.startDate}`);
    console.log(`URL: ${sampleEvent.url}`);
    
    // Test 4: Verify all events have dates
    console.log('\nTest 4: Verifying all events have valid dates...');
    const eventsWithDates = events.filter(event => event.startDate instanceof Date);
    assert(eventsWithDates.length === events.length, 'All events should have valid dates');
    console.log(`✅ Test 4 Passed: All ${events.length} events have valid dates`);
    
    // Test 5: Check for upcoming events
    console.log('\nTest 5: Verifying upcoming events...');
    const now = new Date();
    const upcomingEvents = events.filter(event => event.startDate > now);
    console.log(`Found ${upcomingEvents.length} upcoming events`);
    assert(upcomingEvents.length > 0, 'There should be upcoming events');
    console.log(`✅ Test 5 Passed: Found ${upcomingEvents.length} upcoming events`);
    
    console.log('\n🎉 All tests passed! Commodore Ballroom scraper is working correctly.');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    return false;
  }
}

// Run the test
testCommodoreScraper().then(success => {
  console.log('Test completed');
});
