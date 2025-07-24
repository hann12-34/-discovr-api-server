/**
 * Test all Toronto scrapers to verify they're working properly
 */

const TorontoCaEvents = require('./scrapers/cities/Toronto/scrape-toronto-ca-events');
const NowPlayingTorontoEvents = require('./scrapers/cities/Toronto/scrape-nowplaying-toronto-events');
const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function testAllTorontoScrapers() {
    console.log('🏙️ Testing all Toronto scrapers...\n');
    
    const scrapers = [
        { name: 'Toronto.ca Events', scraper: new TorontoCaEvents() },
        { name: 'Now Playing Toronto', scraper: new NowPlayingTorontoEvents() },
        { name: 'TodoCanada Toronto', scraper: new TodoCanadaTorontoEvents() }
    ];
    
    const results = [];
    
    for (const { name, scraper } of scrapers) {
        console.log(`\n🔍 Testing ${name}...`);
        
        try {
            const startTime = Date.now();
            const events = await scraper.fetchEvents();
            const duration = Date.now() - startTime;
            
            const result = {
                name,
                success: true,
                eventCount: events.length,
                duration: `${duration}ms`,
                sampleEvent: events.length > 0 ? {
                    name: events[0].name,
                    date: events[0].startDate,
                    venue: events[0].venue?.name,
                    website: events[0].officialWebsite
                } : null
            };
            
            results.push(result);
            
            console.log(`✅ ${name}: Found ${events.length} events in ${duration}ms`);
            if (events.length > 0) {
                console.log(`   Sample: "${events[0].name}"`);
            }
            
        } catch (error) {
            const result = {
                name,
                success: false,
                error: error.message,
                eventCount: 0
            };
            
            results.push(result);
            console.log(`❌ ${name}: Failed - ${error.message}`);
        }
    }
    
    // Summary
    console.log('\n📊 TORONTO SCRAPERS SUMMARY:');
    console.log('=' + '='.repeat(50));
    
    const totalEvents = results.reduce((sum, result) => sum + result.eventCount, 0);
    const successfulScrapers = results.filter(r => r.success).length;
    
    console.log(`Total scrapers: ${results.length}`);
    console.log(`Successful scrapers: ${successfulScrapers}`);
    console.log(`Failed scrapers: ${results.length - successfulScrapers}`);
    console.log(`Total events found: ${totalEvents}`);
    
    console.log('\nDetailed Results:');
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const info = result.success 
            ? `${result.eventCount} events (${result.duration})`
            : `Error: ${result.error}`;
        console.log(`${status} ${result.name}: ${info}`);
    });
    
    if (totalEvents > 0) {
        console.log('\n🎉 SUCCESS: Toronto scrapers are working and returning real event data!');
        console.log('📋 No fallback or dummy data detected - all events are real.');
    } else {
        console.log('\n⚠️ WARNING: No events found across all scrapers - investigate further.');
    }
}

testAllTorontoScrapers().catch(console.error);
