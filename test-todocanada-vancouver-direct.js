/**
 * Test TodoCanada Vancouver scraper directly
 */

const TodoCanadaVancouverEvents = require('./scrapers/cities/vancouver/scrape-todocanada-vancouver-events');

async function testTodoCanadaVancouver() {
    console.log('🧪 Testing TodoCanada Vancouver scraper directly...');
    
    const scraper = new TodoCanadaVancouverEvents();
    
    try {
        console.log('📋 Venue Name:', scraper.venueName);
        console.log(`📡 URL: ${scraper.eventsUrl}`);
        
        const events = await scraper.fetchEvents();
        
        console.log(`\n📊 Results Summary:`);
        console.log(`- Total events found: ${events.length}`);
        
        if (events.length > 0) {
            console.log(`\n🎯 Sample Events:`);
            events.slice(0, 3).forEach((event, index) => {
                console.log(`${index + 1}. ${event.name}`);
                console.log(`   📅 Date: ${event.startDate || 'TBD'}`);
                console.log(`   📍 Venue: ${event.venue.name}`);
                console.log(`   💰 Price: ${event.price || 'N/A'}`);
                console.log(`   🌐 Website: ${event.officialWebsite || 'N/A'}`);
                console.log('');
            });
            
            console.log(`\n✅ SUCCESS: TodoCanada Vancouver scraper working!`);
            console.log(`📈 Found ${events.length} real events (no fallback data)`);
        } else {
            console.log(`\n⚠️ No events found - could be 403 block or no events available`);
        }
        
    } catch (error) {
        console.error('❌ Error testing scraper:', error.message);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
        }
    }
}

testTodoCanadaVancouver();
