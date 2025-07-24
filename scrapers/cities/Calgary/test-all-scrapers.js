const fs = require('fs');
const path = require('path');

/**
 * Test runner for all Calgary scrapers
 * This will run all scrapers and show results
 */
async function testAllScrapers() {
    console.log('🧪 Testing all Calgary scrapers...\n');
    
    const scrapersDir = __dirname;
    const scraperFiles = fs.readdirSync(scrapersDir)
        .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && file !== 'test-all-scrapers.js')
        .sort();
    
    console.log(`Found ${scraperFiles.length} scrapers to test\n`);
    
    const results = [];
    
    for (const scraperFile of scraperFiles) {
        const scraperPath = path.join(scrapersDir, scraperFile);
        const scraperName = scraperFile.replace('scrape-', '').replace('.js', '');
        
        try {
            console.log(`\n📍 Testing ${scraperName}...`);
            
            // Clear require cache to ensure fresh instance
            delete require.cache[require.resolve(scraperPath)];
            
            const ScraperClass = require(scraperPath);
            const scraper = new ScraperClass();
            
            const startTime = Date.now();
            const events = await scraper.scrapeEvents();
            const duration = Date.now() - startTime;
            
            results.push({
                scraper: scraperName,
                events: events.length,
                duration: duration,
                status: 'success',
                source: scraper.source || scraperName
            });
            
            console.log(`✅ ${scraperName}: ${events.length} events (${duration}ms)`);
            
        } catch (error) {
            console.log(`❌ ${scraperName}: Error - ${error.message}`);
            results.push({
                scraper: scraperName,
                events: 0,
                duration: 0,
                status: 'error',
                error: error.message
            });
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('CALGARY SCRAPERS TEST SUMMARY');
    console.log('='.repeat(70));
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const totalEvents = successful.reduce((sum, r) => sum + r.events, 0);
    const avgDuration = successful.length > 0 ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length : 0;
    
    console.log(`Total scrapers: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Total events found: ${totalEvents}`);
    console.log(`Average duration: ${Math.round(avgDuration)}ms`);
    
    // Top performers
    console.log('\n🏆 TOP PERFORMERS:');
    const topPerformers = successful
        .filter(r => r.events > 0)
        .sort((a, b) => b.events - a.events)
        .slice(0, 10);
    
    topPerformers.forEach((result, index) => {
        console.log(`${index + 1}. ${result.source}: ${result.events} events`);
    });
    
    // Failed scrapers
    if (failed.length > 0) {
        console.log('\n❌ FAILED SCRAPERS:');
        failed.forEach(result => {
            console.log(`• ${result.scraper}: ${result.error}`);
        });
    }
    
    // Zero results
    const zeroResults = successful.filter(r => r.events === 0);
    if (zeroResults.length > 0) {
        console.log('\n⚠️  SCRAPERS WITH ZERO EVENTS:');
        zeroResults.forEach(result => {
            console.log(`• ${result.scraper}`);
        });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`Calgary Event Scraper Coverage: ${successful.length}/${results.length} venues (${Math.round(successful.length/results.length*100)}%)`);
    console.log('='.repeat(70));
    
    return results;
}

// Run the test
if (require.main === module) {
    testAllScrapers().catch(console.error);
}

module.exports = testAllScrapers;
