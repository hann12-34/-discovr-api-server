const fs = require('fs');
const path = require('path');

/**
 * Comprehensive test runner for all Toronto scrapers
 * Tests all scrapers and provides detailed coverage analysis
 */
async function testAllTorontoScrapers() {
    console.log('🍁 Testing all Toronto scrapers...\n');
    
    const scrapersDir = __dirname;
    const scraperFiles = fs.readdirSync(scrapersDir)
        .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && 
                !file.includes('test-all-toronto-scrapers.js'))
        .sort();
    
    // Also include the original venue scrapers
    const originalVenueFiles = fs.readdirSync(scrapersDir)
        .filter(file => (file.endsWith('.js') && 
                !file.includes('test-all-toronto-scrapers.js') && 
                !file.includes('scrape-all-toronto.js') && 
                !file.includes('template-venue.js') &&
                !file.includes('index.js') &&
                !file.includes('toronto-events.js') &&
                !file.startsWith('scrape-')) &&
                (file.includes('massey') || file.includes('meridian') || file.includes('roy-thomson')))
        .sort();
    
    const allScrapers = [...scraperFiles, ...originalVenueFiles];
    console.log(`Found ${allScrapers.length} scrapers to test\n`);
    
    const results = [];
    const startTime = Date.now();
    
    for (const scraperFile of allScrapers) {
        const scraperPath = path.join(scrapersDir, scraperFile);
        const scraperName = scraperFile.replace(/^scrape-/, '').replace(/\.js$/, '');
        
        try {
            console.log(`\n🏢 Testing ${scraperName}...`);
            
            // Clear require cache for fresh instance
            delete require.cache[require.resolve(scraperPath)];
            
            const scraperModule = require(scraperPath);
            let scraper = null;
            let events = [];
            
            const testStartTime = Date.now();
            
            // Handle different export patterns
            if (typeof scraperModule === 'function') {
                // Class constructor
                scraper = new scraperModule();
                if (scraper.scrapeEvents) {
                    events = await scraper.scrapeEvents();
                }
            } else if (scraperModule.default) {
                // ES6 default export
                scraper = new scraperModule.default();
                if (scraper.scrapeEvents) {
                    events = await scraper.scrapeEvents();
                }
            } else if (scraperModule.scrapeEvents) {
                // Direct function export
                events = await scraperModule.scrapeEvents();
            } else {
                // Look for any scrape function
                const scrapeKeys = Object.keys(scraperModule).filter(key => 
                    key.toLowerCase().includes('scrape') && typeof scraperModule[key] === 'function'
                );
                
                if (scrapeKeys.length > 0) {
                    events = await scraperModule[scrapeKeys[0]]();
                } else {
                    console.log(`⚠️  No scrape method found for ${scraperName}`);
                    continue;
                }
            }
            
            const duration = Date.now() - testStartTime;
            const source = scraper?.source || scraper?.name || scraperName;
            
            results.push({
                scraper: scraperName,
                events: Array.isArray(events) ? events.length : 0,
                duration: duration,
                status: 'success',
                source: source
            });
            
            console.log(`✅ ${scraperName}: ${Array.isArray(events) ? events.length : 0} events (${duration}ms)`);
            
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
    
    const totalDuration = Date.now() - startTime;
    
    // Summary Analysis
    console.log('\n' + '='.repeat(80));
    console.log('TORONTO SCRAPERS COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(80));
    
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const withEvents = successful.filter(r => r.events > 0);
    const withoutEvents = successful.filter(r => r.events === 0);
    const totalEvents = successful.reduce((sum, r) => sum + r.events, 0);
    const avgDuration = successful.length > 0 ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length : 0;
    
    console.log(`Total scrapers tested: ${results.length}`);
    console.log(`Successful: ${successful.length} (${Math.round(successful.length/results.length*100)}%)`);
    console.log(`Failed: ${failed.length} (${Math.round(failed.length/results.length*100)}%)`);
    console.log(`With events: ${withEvents.length} (${Math.round(withEvents.length/results.length*100)}%)`);
    console.log(`Without events: ${withoutEvents.length} (${Math.round(withoutEvents.length/results.length*100)}%)`);
    console.log(`Total events found: ${totalEvents}`);
    console.log(`Average duration: ${Math.round(avgDuration)}ms`);
    console.log(`Total test duration: ${Math.round(totalDuration/1000)}s`);
    
    // Top Performers
    console.log('\n🏆 TOP 15 PERFORMERS (Most Events):');
    const topPerformers = withEvents
        .sort((a, b) => b.events - a.events)
        .slice(0, 15);
    
    topPerformers.forEach((result, index) => {
        console.log(`${index + 1}. ${result.source}: ${result.events} events`);
    });
    
    // Fastest Scrapers
    console.log('\n⚡ FASTEST SCRAPERS (Under 2 seconds):');
    const fastScrapers = successful
        .filter(r => r.duration < 2000 && r.events > 0)
        .sort((a, b) => a.duration - b.duration)
        .slice(0, 10);
    
    fastScrapers.forEach((result, index) => {
        console.log(`${index + 1}. ${result.source}: ${result.events} events (${result.duration}ms)`);
    });
    
    // Category Analysis
    console.log('\n📊 VENUE CATEGORY ANALYSIS:');
    const categories = {
        'Museums & Galleries': 0,
        'Theaters & Performance': 0,
        'Nightlife & Clubs': 0,
        'Parks & Outdoor': 0,
        'Libraries & Education': 0,
        'Markets & Shopping': 0,
        'Sports & Recreation': 0,
        'Festivals & Events': 0,
        'Restaurants & Breweries': 0,
        'Other': 0
    };
    
    results.forEach(result => {
        const name = result.scraper.toLowerCase();
        if (name.includes('museum') || name.includes('gallery') || name.includes('ago') || 
            name.includes('rom') || name.includes('moca') || name.includes('gardiner') || 
            name.includes('textile') || name.includes('hockey-hall')) {
            categories['Museums & Galleries']++;
        } else if (name.includes('theatre') || name.includes('theater') || name.includes('hall') || 
                   name.includes('massey') || name.includes('meridian') || name.includes('roy-thomson') ||
                   name.includes('soulpepper') || name.includes('factory') || name.includes('second-city')) {
            categories['Theaters & Performance']++;
        } else if (name.includes('club') || name.includes('lounge') || name.includes('nightclub') || 
                   name.includes('rebel') || name.includes('nest') || name.includes('oasis') || 
                   name.includes('velvet') || name.includes('fiction') || name.includes('lost') ||
                   name.includes('vertigo') || name.includes('revival') || name.includes('lula') ||
                   name.includes('dirty-martini') || name.includes('6ix') || name.includes('xclub')) {
            categories['Nightlife & Clubs']++;
        } else if (name.includes('park') || name.includes('garden') || name.includes('zoo') || 
                   name.includes('conservancy') || name.includes('brick-works') || name.includes('waterfront') ||
                   name.includes('harbourfront') || name.includes('downsview') || name.includes('roundhouse')) {
            categories['Parks & Outdoor']++;
        } else if (name.includes('library') || name.includes('university') || name.includes('college') || 
                   name.includes('ocadu') || name.includes('science-centre')) {
            categories['Libraries & Education']++;
        } else if (name.includes('market') || name.includes('mall') || name.includes('shopping') || 
                   name.includes('distillery') || name.includes('stackt') || name.includes('queens-quay') ||
                   name.includes('square-one') || name.includes('kensington')) {
            categories['Markets & Shopping']++;
        } else if (name.includes('sport') || name.includes('bowl') || name.includes('aqua') || 
                   name.includes('playtime') || name.includes('wetnwild')) {
            categories['Sports & Recreation']++;
        } else if (name.includes('festival') || name.includes('events') || name.includes('todocanada') || 
                   name.includes('nowplaying') || name.includes('toronto-ca')) {
            categories['Festivals & Events']++;
        } else if (name.includes('brewery') || name.includes('restaurant') || name.includes('tavern') || 
                   name.includes('steam-whistle') || name.includes('henderson') || name.includes('junction') ||
                   name.includes('mascot') || name.includes('blood-brothers') || name.includes('horseshoe') ||
                   name.includes('poetry-jazz')) {
            categories['Restaurants & Breweries']++;
        } else {
            categories['Other']++;
        }
    });
    
    Object.entries(categories).forEach(([category, count]) => {
        console.log(`${category}: ${count} scrapers`);
    });
    
    // Failed Scrapers Analysis
    if (failed.length > 0) {
        console.log('\n❌ FAILED SCRAPERS ANALYSIS:');
        const errorTypes = {};
        failed.forEach(result => {
            const errorType = result.error.includes('404') ? '404 Not Found' :
                             result.error.includes('403') ? '403 Forbidden' :
                             result.error.includes('timeout') ? 'Timeout' :
                             result.error.includes('ENOTFOUND') ? 'Domain Not Found' :
                             result.error.includes('ECONNREFUSED') ? 'Connection Refused' :
                             'Other Error';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
        });
        
        Object.entries(errorTypes).forEach(([errorType, count]) => {
            console.log(`${errorType}: ${count} scrapers`);
        });
        
        console.log('\nDetailed failed scrapers:');
        failed.forEach(result => {
            console.log(`• ${result.scraper}: ${result.error}`);
        });
    }
    
    // Zero Events Analysis
    if (withoutEvents.length > 0) {
        console.log('\n⚠️  SCRAPERS WITH ZERO EVENTS:');
        withoutEvents.forEach(result => {
            console.log(`• ${result.scraper}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`Toronto Event Scraper Coverage: ${successful.length}/${results.length} venues (${Math.round(successful.length/results.length*100)}%)`);
    console.log(`Active Event Sources: ${withEvents.length}/${results.length} venues (${Math.round(withEvents.length/results.length*100)}%)`);
    console.log('='.repeat(80));
    
    return {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        withEvents: withEvents.length,
        totalEvents: totalEvents,
        results: results
    };
}

// Run the test
if (require.main === module) {
    testAllTorontoScrapers().catch(console.error);
}

module.exports = testAllTorontoScrapers;
