const PlaceDesArtsEvents = require('./scrapers/cities/Montreal/scrape-place-des-arts');
const MontrealScienceCentreEvents = require('./scrapers/cities/Montreal/scrape-montreal-science-centre');
const NewCityGasEvents = require('./scrapers/cities/Montreal/scrape-new-city-gas');
const VieuxMontrealEvents = require('./scrapers/cities/Montreal/scrape-vieux-montreal');

/**
 * Test all Montreal scrapers
 */
async function testMontrealScrapers() {
    console.log('🇨🇦 Testing Montreal Event Scrapers...\n');
    
    const scrapers = [
        { name: 'Place des Arts', scraper: new PlaceDesArtsEvents() },
        { name: 'Montreal Science Centre', scraper: new MontrealScienceCentreEvents() },
        { name: 'New City Gas', scraper: new NewCityGasEvents() },
        { name: 'Vieux-Montréal', scraper: new VieuxMontrealEvents() }
    ];
    
    const results = [];
    
    for (const { name, scraper } of scrapers) {
        try {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🎯 Testing ${name}...`);
            console.log(`${'='.repeat(50)}`);
            
            const startTime = Date.now();
            const events = await scraper.scrapeEvents();
            const endTime = Date.now();
            
            const result = {
                name: name,
                source: scraper.source,
                url: scraper.eventsUrl,
                eventsFound: events.length,
                duration: `${((endTime - startTime) / 1000).toFixed(2)}s`,
                status: events.length > 0 ? '✅ Success' : '⚠️ No events found',
                sampleEvents: events.slice(0, 2)
            };
            
            results.push(result);
            
            console.log(`📊 Results for ${name}:`);
            console.log(`   Events found: ${events.length}`);
            console.log(`   Duration: ${result.duration}`);
            console.log(`   Status: ${result.status}`);
            
            if (events.length > 0) {
                console.log(`\n📋 Sample events:`);
                events.slice(0, 2).forEach((event, index) => {
                    console.log(`   ${index + 1}. ${event.name}`);
                    console.log(`      📅 Date: ${event.date || 'Not specified'}`);
                    console.log(`      📍 Venue: ${event.venue.name}`);
                    console.log(`      💰 Price: ${event.price}`);
                    console.log(`      🔗 URL: ${event.url || 'Not available'}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Error testing ${name}:`, error.message);
            results.push({
                name: name,
                source: scraper.source,
                url: scraper.eventsUrl,
                eventsFound: 0,
                duration: '0s',
                status: `❌ Error: ${error.message}`,
                sampleEvents: []
            });
        }
    }
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 MONTREAL SCRAPERS SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    
    let totalEvents = 0;
    let successfulScrapers = 0;
    
    results.forEach(result => {
        console.log(`\n🎯 ${result.name}:`);
        console.log(`   Source: ${result.source}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Events: ${result.eventsFound}`);
        console.log(`   Duration: ${result.duration}`);
        console.log(`   Status: ${result.status}`);
        
        totalEvents += result.eventsFound;
        if (result.eventsFound > 0) {
            successfulScrapers++;
        }
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 FINAL RESULTS:`);
    console.log(`   Total scrapers tested: ${results.length}`);
    console.log(`   Successful scrapers: ${successfulScrapers}`);
    console.log(`   Total events found: ${totalEvents}`);
    console.log(`   Success rate: ${((successfulScrapers / results.length) * 100).toFixed(1)}%`);
    console.log(`${'='.repeat(60)}`);
    
    return results;
}

// Run the test
if (require.main === module) {
    testMontrealScrapers()
        .then(results => {
            console.log('\n✅ Montreal scrapers test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error running Montreal scrapers test:', error);
            process.exit(1);
        });
}

module.exports = testMontrealScrapers;
