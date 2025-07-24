/**
 * Test the new Toronto event scrapers
 */

const TorontoCaEvents = require('./scrapers/cities/Toronto/scrape-toronto-ca-events');
const NowPlayingTorontoEvents = require('./scrapers/cities/Toronto/scrape-nowplaying-toronto-events');
// TodoCanada scraper removed due to 403 blocking

async function testScrapers() {
    console.log('🧪 Testing new Toronto event scrapers...\n');
    
    const scrapers = [
        { name: 'City of Toronto Events', scraper: new TorontoCaEvents() },
        { name: 'Now Playing Toronto', scraper: new NowPlayingTorontoEvents() }
    ];
    
    for (const { name, scraper } of scrapers) {
        console.log(`\n🔍 Testing ${name}...`);
        console.log(`📡 URL: ${scraper.eventsUrl}`);
        
        try {
            const events = await scraper.fetchEvents();
            
            if (events && events.length > 0) {
                console.log(`✅ SUCCESS: Found ${events.length} events from ${name}`);
                
                // Show sample event
                const sampleEvent = events[0];
                console.log('\n📋 Sample Event:');
                console.log(`   Title: ${sampleEvent.title || sampleEvent.name}`);
                console.log(`   Date: ${sampleEvent.startDate || 'No date'}`);
                console.log(`   Venue: ${sampleEvent.venue?.name || 'No venue'}`);
                console.log(`   Location: ${sampleEvent.location || 'No location'}`);
                console.log(`   Price: ${sampleEvent.price || 'No price'}`);
                console.log(`   Source: ${sampleEvent.source || 'No source'}`);
                console.log(`   Coordinates: [${sampleEvent.venue?.coordinates?.longitude}, ${sampleEvent.venue?.coordinates?.latitude}]`);
                
                // Check for required fields
                const requiredFields = ['id', 'title', 'venue'];
                const missingFields = requiredFields.filter(field => !sampleEvent[field]);
                
                if (missingFields.length > 0) {
                    console.log(`⚠️  Missing required fields: ${missingFields.join(', ')}`);
                } else {
                    console.log('✅ All required fields present');
                }
                
                // Show all event titles
                console.log('\n📝 All Events:');
                events.forEach((event, index) => {
                    console.log(`   ${index + 1}. ${event.title || event.name}`);
                });
                
            } else {
                console.log(`⚠️  No events found from ${name}`);
            }
            
        } catch (error) {
            console.error(`❌ ERROR testing ${name}:`, error.message);
        }
        
        console.log('─'.repeat(60));
    }
    
    console.log('\n🎉 Toronto scraper testing completed!');
}

// Run the test
testScrapers().catch(console.error);
