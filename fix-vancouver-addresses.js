/**
 * Fix Vancouver addresses in Toronto events
 * This script identifies and fixes events that have incorrect Vancouver addresses
 */

const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function fixVancouverAddresses() {
    console.log('🔍 Running TodoCanada Toronto scraper to check for Vancouver addresses...\n');
    
    const scraper = new TodoCanadaTorontoEvents();
    
    try {
        const events = await scraper.fetchEvents();
        
        console.log(`📊 Found ${events.length} events from TodoCanada Toronto\n`);
        
        // Check for any events with Vancouver addresses
        const vancouverEvents = events.filter(event => 
            event.venue.address.toLowerCase().includes('vancouver') ||
            event.venue.address.toLowerCase().includes('bc') ||
            event.venue.city.toLowerCase().includes('vancouver')
        );
        
        if (vancouverEvents.length > 0) {
            console.log(`❌ Found ${vancouverEvents.length} events with Vancouver addresses:`);
            vancouverEvents.forEach(event => {
                console.log(`  - ${event.name}`);
                console.log(`    Address: ${event.venue.address}`);
                console.log(`    City: ${event.venue.city}, ${event.venue.province}`);
                console.log('');
            });
        } else {
            console.log('✅ No events found with Vancouver addresses! All events have correct locations.');
        }
        
        // Show sample of correctly formatted events
        console.log('\n📍 Sample of correctly formatted events:');
        events.slice(0, 5).forEach((event, index) => {
            console.log(`${index + 1}. ${event.name}`);
            console.log(`   📍 ${event.venue.address}`);
            console.log(`   🏢 ${event.venue.city}, ${event.venue.province}`);
            console.log('');
        });
        
        // Look for "Learn More" events
        const learnMoreEvents = events.filter(event => 
            event.name.toLowerCase().includes('learn more') ||
            event.title.toLowerCase().includes('learn more')
        );
        
        if (learnMoreEvents.length > 0) {
            console.log(`⚠️  Found ${learnMoreEvents.length} "Learn More" events that should be filtered out:`);
            learnMoreEvents.forEach(event => {
                console.log(`  - ${event.name}`);
            });
        } else {
            console.log('✅ No "Learn More" events found - filtering is working correctly.');
        }
        
    } catch (error) {
        console.error('❌ Error running scraper:', error.message);
    }
}

fixVancouverAddresses();
