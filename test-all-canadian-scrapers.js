const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Test for ALL Canadian City Event Scrapers
 * Tests Montreal, Toronto, and any other city scrapers
 */
async function testAllCanadianScrapers() {
    console.log('🇨🇦 TESTING ALL CANADIAN EVENT SCRAPERS');
    console.log('=' .repeat(80));
    
    const citiesDir = path.join(__dirname, 'scrapers/cities');
    const cityResults = {};
    let totalScrapers = 0;
    let totalSuccessful = 0;
    let totalEvents = 0;
    
    // Get all cities
    const cities = fs.readdirSync(citiesDir).filter(item => {
        const cityPath = path.join(citiesDir, item);
        return fs.statSync(cityPath).isDirectory();
    });
    
    console.log(`Found ${cities.length} cities: ${cities.join(', ')}\n`);
    
    // Test each city
    for (const city of cities) {
        console.log(`\n${'🏙️ '.repeat(20)}`);
        console.log(`🏙️  TESTING ${city.toUpperCase()} SCRAPERS`);
        console.log(`${'🏙️ '.repeat(20)}\n`);
        
        const cityPath = path.join(citiesDir, city);
        const scraperFiles = fs.readdirSync(cityPath)
            .filter(file => file.endsWith('.js') && !file.includes('index') && !file.includes('template'));
        
        console.log(`Found ${scraperFiles.length} ${city} scrapers to test\n`);
        
        const cityResult = {
            city: city,
            totalScrapers: scraperFiles.length,
            successfulScrapers: 0,
            totalEvents: 0,
            scrapers: []
        };
        
        // Test each scraper in the city
        for (const file of scraperFiles) {
            try {
                const ScraperClass = require(path.join(cityPath, file));
                const scraper = new ScraperClass();
                
                console.log(`\n${'─'.repeat(60)}`);
                console.log(`🎯 Testing: ${scraper.source || file}`);
                console.log(`   File: ${file}`);
                console.log(`   URL: ${scraper.eventsUrl || scraper.baseUrl || 'Unknown'}`);
                console.log(`${'─'.repeat(60)}`);
                
                const startTime = Date.now();
                const events = await scraper.scrapeEvents();
                const endTime = Date.now();
                
                const scraperResult = {
                    name: scraper.source || file.replace('.js', ''),
                    file: file,
                    url: scraper.eventsUrl || scraper.baseUrl,
                    eventsFound: events.length,
                    duration: `${((endTime - startTime) / 1000).toFixed(2)}s`,
                    status: events.length > 0 ? '✅ Success' : '⚠️ No events found',
                    sampleEvent: events.length > 0 ? events[0].name : null
                };
                
                cityResult.scrapers.push(scraperResult);
                cityResult.totalEvents += events.length;
                
                if (events.length > 0) {
                    cityResult.successfulScrapers++;
                    console.log(`   ✅ SUCCESS: ${events.length} events found`);
                    console.log(`   📅 Sample: ${events[0].name}`);
                } else {
                    console.log(`   ⚠️  No events found`);
                }
                
                console.log(`   ⏱️  Duration: ${scraperResult.duration}`);
                
            } catch (error) {
                console.error(`   ❌ ERROR: ${error.message}`);
                cityResult.scrapers.push({
                    name: file.replace('.js', ''),
                    file: file,
                    eventsFound: 0,
                    duration: '0s',
                    status: `❌ Error: ${error.message.substring(0, 50)}...`,
                    sampleEvent: null
                });
            }
        }
        
        cityResults[city] = cityResult;
        totalScrapers += cityResult.totalScrapers;
        totalSuccessful += cityResult.successfulScrapers;
        totalEvents += cityResult.totalEvents;
        
        // City Summary
        console.log(`\n${'🏙️ '.repeat(20)}`);
        console.log(`📊 ${city.toUpperCase()} SUMMARY:`);
        console.log(`   Total scrapers: ${cityResult.totalScrapers}`);
        console.log(`   Successful: ${cityResult.successfulScrapers}`);
        console.log(`   Success rate: ${((cityResult.successfulScrapers / cityResult.totalScrapers) * 100).toFixed(1)}%`);
        console.log(`   Total events: ${cityResult.totalEvents}`);
        console.log(`${'🏙️ '.repeat(20)}`);
    }
    
    // Overall Summary
    console.log(`\n${'🇨🇦 '.repeat(30)}`);
    console.log(`🇨🇦 FINAL CANADIAN SCRAPERS SUMMARY`);
    console.log(`${'🇨🇦 '.repeat(30)}\n`);
    
    // City-by-city breakdown
    for (const [cityName, cityResult] of Object.entries(cityResults)) {
        console.log(`🏙️  ${cityName.toUpperCase()}:`);
        console.log(`   📊 Scrapers: ${cityResult.totalScrapers}`);
        console.log(`   ✅ Working: ${cityResult.successfulScrapers} (${((cityResult.successfulScrapers / cityResult.totalScrapers) * 100).toFixed(1)}%)`);
        console.log(`   🎉 Events: ${cityResult.totalEvents}`);
        
        // Top performers for this city
        const topPerformers = cityResult.scrapers
            .filter(s => s.eventsFound > 0)
            .sort((a, b) => b.eventsFound - a.eventsFound)
            .slice(0, 3);
            
        if (topPerformers.length > 0) {
            console.log(`   🏆 Top performers:`);
            topPerformers.forEach((performer, index) => {
                console.log(`      ${index + 1}. ${performer.name}: ${performer.eventsFound} events`);
            });
        }
        console.log('');
    }
    
    // Overall totals
    console.log(`${'='.repeat(80)}`);
    console.log(`🎯 OVERALL CANADIAN EVENT SCRAPING INFRASTRUCTURE:`);
    console.log(`   🏙️  Cities covered: ${cities.length}`);
    console.log(`   🎪 Total scrapers: ${totalScrapers}`);
    console.log(`   ✅ Working scrapers: ${totalSuccessful}`);
    console.log(`   📈 Overall success rate: ${((totalSuccessful / totalScrapers) * 100).toFixed(1)}%`);
    console.log(`   🎉 Total events found: ${totalEvents}`);
    console.log(`${'='.repeat(80)}`);
    
    // Find overall top performers
    const allScrapers = Object.values(cityResults).flatMap(city => 
        city.scrapers.map(s => ({ ...s, city: city.city }))
    );
    
    const overallTopPerformers = allScrapers
        .filter(s => s.eventsFound > 0)
        .sort((a, b) => b.eventsFound - a.eventsFound)
        .slice(0, 10);
    
    if (overallTopPerformers.length > 0) {
        console.log(`\n🏆 TOP 10 PERFORMERS ACROSS ALL CITIES:`);
        overallTopPerformers.forEach((performer, index) => {
            console.log(`   ${index + 1}. ${performer.name} (${performer.city}): ${performer.eventsFound} events`);
        });
    }
    
    console.log(`\n🇨🇦 Canadian Event Scraping Test Complete! 🇨🇦`);
    
    return {
        cities: cityResults,
        summary: {
            totalCities: cities.length,
            totalScrapers,
            totalSuccessful,
            totalEvents,
            successRate: ((totalSuccessful / totalScrapers) * 100).toFixed(1)
        }
    };
}

// Run the comprehensive test
if (require.main === module) {
    testAllCanadianScrapers()
        .then(results => {
            console.log('\n✅ Comprehensive Canadian scrapers test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Error running comprehensive test:', error);
            process.exit(1);
        });
}

module.exports = testAllCanadianScrapers;
