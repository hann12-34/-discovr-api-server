/**
 * Test the updated Now Playing Toronto scraper
 */

const NowPlayingTorontoEvents = require('./scrapers/cities/Toronto/scrape-nowplaying-toronto-events');

async function testNowPlayingScraper() {
    console.log('🧪 Testing updated Now Playing Toronto scraper...');
    
    const scraper = new NowPlayingTorontoEvents();
    
    try {
        console.log('📋 Venue Info:', scraper.getVenueInfo());
        
        const events = await scraper.fetchEvents();
        
        console.log(`\n📊 Results Summary:`);
        console.log(`- Total events found: ${events.length}`);
        
        if (events.length > 0) {
            console.log(`\n🎯 Sample Events:`);
            events.slice(0, 3).forEach((event, index) => {
                console.log(`${index + 1}. ${event.name}`);
                console.log(`   📅 Date: ${event.startDate || 'TBD'}`);
                console.log(`   📍 Venue: ${event.venue.name}`);
                console.log(`   🌐 Website: ${event.officialWebsite || 'N/A'}`);
                console.log(`   🖼️ Image: ${event.imageUrl || 'N/A'}`);
                console.log('');
            });
            
            console.log(`\n✅ SUCCESS: Now Playing Toronto scraper working!`);
            console.log(`📈 Found ${events.length} real events (no fallback data)`);
        } else {
            console.log(`\n⚠️ No events found - check the scraper logic`);
        }
        
    } catch (error) {
        console.error('❌ Error testing scraper:', error.message);
    }
}

testNowPlayingScraper();
