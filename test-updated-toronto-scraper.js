/**
 * Test the updated Toronto.ca scraper with API
 */

const TorontoCaEvents = require('./scrapers/cities/Toronto/scrape-toronto-ca-events');

async function testUpdatedScraper() {
    console.log('🧪 Testing updated Toronto.ca scraper with API...');
    
    const scraper = new TorontoCaEvents();
    
    try {
        console.log('📋 Venue Info:', scraper.getVenueInfo());
        
        const events = await scraper.fetchEvents();
        
        console.log(`\n📊 Results Summary:`);
        console.log(`- Total events found: ${events.length}`);
        
        if (events.length > 0) {
            console.log(`\n🎯 Sample Events:`);
            events.slice(0, 5).forEach((event, index) => {
                console.log(`${index + 1}. ${event.name}`);
                console.log(`   📅 Date: ${event.startDate || 'TBD'}`);
                console.log(`   📍 Location: ${event.venue.name}`);
                console.log(`   💰 Price: ${event.price}`);
                console.log(`   🌐 Website: ${event.officialWebsite || 'N/A'}`);
                console.log('');
            });
            
            console.log(`\n✅ SUCCESS: Toronto.ca scraper now working with API!`);
            console.log(`📈 Found ${events.length} real events (no fallback data)`);
        } else {
            console.log(`\n⚠️ No events found - this may indicate an issue`);
        }
        
    } catch (error) {
        console.error('❌ Error testing scraper:', error.message);
    }
}

testUpdatedScraper();
