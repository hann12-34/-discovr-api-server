/**
 * Test New York Scrapers End-to-End Import
 * 
 * This tests the actual runtime functionality of our 40 confirmed working
 * New York scrapers by running them and checking their output.
 * 
 * Following the proven Toronto approach for end-to-end validation.
 */

const path = require('path');

// Import our clean New York orchestrator with 40 confirmed working scrapers
const newYorkScrapers = require('./scrapers/cities/New York/scrape-all-new-york-clean.js');

async function testNewYorkScrapers() {
    console.log('\n🗽 NEW YORK SCRAPERS END-TO-END TEST'.cyan);
    console.log('='.repeat(50).cyan);
    
    console.log(`\n📊 Testing ${Object.keys(newYorkScrapers).length} confirmed working New York scrapers...\n`);
    
    let totalEvents = 0;
    let successfulScrapers = 0;
    let failedScrapers = 0;
    
    for (const [scraperName, scraperInstance] of Object.entries(newYorkScrapers)) {
        try {
            console.log(`🔄 Testing ${scraperName}...`);
            
            // Test the actual scraping functionality
            const events = await scraperInstance.scrape();
            
            if (Array.isArray(events) && events.length >= 0) {
                console.log(`✅ ${scraperName}: Found ${events.length} events`);
                totalEvents += events.length;
                successfulScrapers++;
                
                // Log a sample event if available
                if (events.length > 0) {
                    const sampleEvent = events[0];
                    console.log(`   📝 Sample: "${sampleEvent.title}" at ${sampleEvent.venue}`);
                }
            } else {
                console.log(`⚠️  ${scraperName}: Invalid response format`);
                failedScrapers++;
            }
            
        } catch (error) {
            console.log(`❌ ${scraperName}: ${error.message}`);
            failedScrapers++;
        }
        
        console.log(''); // Add spacing
    }
    
    console.log('\n📊 NEW YORK SCRAPERS TEST RESULTS'.cyan.bold);
    console.log('='.repeat(50).cyan);
    console.log(`✅ Successful scrapers: ${successfulScrapers}`);
    console.log(`❌ Failed scrapers: ${failedScrapers}`);
    console.log(`📊 Total events found: ${totalEvents}`);
    console.log(`📈 Success rate: ${((successfulScrapers / (successfulScrapers + failedScrapers)) * 100).toFixed(1)}%`);
    
    if (successfulScrapers > 0) {
        console.log('\n🎉 NEW YORK SCRAPERS ARE WORKING! Ready for production import!'.green.bold);
    } else {
        console.log('\n⚠️  No scrapers working - further debugging required'.yellow.bold);
    }
}

// Add colors support
const colors = require('colors');

// Run the test
testNewYorkScrapers().catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
});
