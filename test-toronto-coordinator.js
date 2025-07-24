/**
 * Test the Toronto scrapers coordinator with all scrapers
 */

const torontoScrapers = require('./scrapers/cities/Toronto/index');

async function testTorontoCoordinator() {
    console.log('🧪 Testing Toronto Scrapers Coordinator...\n');
    
    try {
        console.log(`📊 Total scrapers configured: ${torontoScrapers.scrapers.length}`);
        
        // List all scrapers
        console.log('\n📋 Configured Scrapers:');
        torontoScrapers.scrapers.forEach((scraper, index) => {
            console.log(`   ${index + 1}. ${scraper.venueName || scraper.constructor.name}`);
        });
        
        console.log('\n🚀 Running all Toronto scrapers...');
        const allEvents = await torontoScrapers.scrape();
        
        console.log(`\n✅ SUCCESS: Total events scraped: ${allEvents.length}`);
        
        if (allEvents.length > 0) {
            // Group events by source
            const eventsBySource = {};
            allEvents.forEach(event => {
                const source = event.source || 'Unknown';
                if (!eventsBySource[source]) {
                    eventsBySource[source] = [];
                }
                eventsBySource[source].push(event);
            });
            
            console.log('\n📊 Events by Source:');
            Object.entries(eventsBySource).forEach(([source, events]) => {
                console.log(`   ${source}: ${events.length} events`);
                events.forEach((event, index) => {
                    console.log(`      ${index + 1}. ${event.title || event.name}`);
                });
            });
            
            // Show sample event details
            const sampleEvent = allEvents[0];
            console.log('\n🔍 Sample Event Details:');
            console.log(`   ID: ${sampleEvent.id}`);
            console.log(`   Title: ${sampleEvent.title}`);
            console.log(`   Date: ${sampleEvent.startDate}`);
            console.log(`   Venue: ${sampleEvent.venue?.name}`);
            console.log(`   Address: ${sampleEvent.venue?.address}`);
            console.log(`   City: ${sampleEvent.venue?.city}`);
            console.log(`   Coordinates: [${sampleEvent.venue?.coordinates?.longitude}, ${sampleEvent.venue?.coordinates?.latitude}]`);
            console.log(`   Price: ${sampleEvent.price}`);
            console.log(`   Source: ${sampleEvent.source}`);
            
            // Verify coordinate format for mobile app compatibility
            const eventsWithCoords = allEvents.filter(event => 
                event.venue?.coordinates?.longitude && event.venue?.coordinates?.latitude
            );
            console.log(`\n📍 Events with coordinates: ${eventsWithCoords.length}/${allEvents.length}`);
            
            if (eventsWithCoords.length > 0) {
                console.log('✅ Coordinate format is correct for mobile app');
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing Toronto coordinator:', error.message);
        console.error(error.stack);
    }
    
    console.log('\n🎉 Toronto coordinator testing completed!');
}

testTorontoCoordinator().catch(console.error);
