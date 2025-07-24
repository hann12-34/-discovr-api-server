const fs = require('fs');
const path = require('path');

/**
 * Test all Montreal scrapers
 */
async function testAllMontrealScrapers() {
    console.log('🇨🇦 Testing ALL Montreal Event Scrapers...\n');
    
    const scrapersDir = path.join(__dirname, 'scrapers/cities/Montreal');
    const scraperFiles = fs.readdirSync(scrapersDir).filter(file => file.endsWith('.js'));
    
    console.log(`Found ${scraperFiles.length} scraper files`);
    
    const results = [];
    
    for (const file of scraperFiles) {
        try {
            const ScraperClass = require(path.join(scrapersDir, file));
            const scraper = new ScraperClass();
            
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🎯 Testing ${scraper.source}...`);
            console.log(`${'='.repeat(50)}`);
            
            const startTime = Date.now();
            const events = await scraper.scrapeEvents();
            const endTime = Date.now();
            
            const result = {
                name: scraper.source,
                file: file,
                url: scraper.eventsUrl,
                eventsFound: events.length,
                duration: `${((endTime - startTime) / 1000).toFixed(2)}s`,
                status: events.length > 0 ? '✅ Success' : '⚠️ No events found',
                sampleEvents: events.slice(0, 1)
            };
            
            results.push(result);
            
            console.log(`📊 Results for ${scraper.source}:`);
            console.log(`   Events found: ${events.length}`);
            console.log(`   Duration: ${result.duration}`);
            console.log(`   Status: ${result.status}`);
            
            if (events.length > 0) {
                console.log(`   Sample: ${events[0].name}`);
            }
            
        } catch (error) {
            console.error(`❌ Error testing ${file}:`, error.message);
            results.push({
                name: file.replace('.js', ''),
                file: file,
                eventsFound: 0,
                duration: '0s',
                status: `❌ Error: ${error.message}`,
                sampleEvents: []
            });
        }
    }
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ALL MONTREAL SCRAPERS SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    
    let totalEvents = 0;
    let successfulScrapers = 0;
    
    results.forEach(result => {
        console.log(`\n🎯 ${result.name}:`);
        console.log(`   File: ${result.file}`);
        console.log(`   Events: ${result.eventsFound}`);
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
    testAllMontrealScrapers()
        .then(results => {
            console.log('\n✅ All Montreal scrapers test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error running Montreal scrapers test:', error);
            process.exit(1);
        });
}

module.exports = testAllMontrealScrapers;