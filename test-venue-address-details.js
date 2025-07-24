/**
 * Test venue address extraction in detail
 */

const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function testVenueAddressDetails() {
    console.log('🧪 Testing venue address extraction details...\n');
    
    const scraper = new TodoCanadaTorontoEvents();
    
    try {
        const events = await scraper.fetchEvents();
        
        console.log(`\n📊 Found ${events.length} events\n`);
        
        if (events.length > 0) {
            console.log('🎯 Detailed Venue Information:');
            console.log('=' + '='.repeat(70));
            
            events.slice(0, 5).forEach((event, index) => {
                console.log(`\n${index + 1}. ${event.name}`);
                console.log(`   📍 Street Address: "${event.streetAddress}"`);
                console.log(`   🏢 Venue Details:`);
                console.log(`      Name: "${event.venue.name}"`);
                console.log(`      Address: "${event.venue.address}"`);
                console.log(`      City: "${event.venue.city}"`);
                console.log(`      Province: "${event.venue.province}"`);
                console.log(`      Country: "${event.venue.country}"`);
                console.log(`      Coordinates: ${event.venue.coordinates.latitude}, ${event.venue.coordinates.longitude}`);
                console.log(`   🌐 Website: ${event.officialWebsite || 'N/A'}`);
                console.log('   ' + '-'.repeat(60));
            });
            
            // Check for address issues
            const addressIssues = events.filter(event => 
                event.venue.address.toLowerCase().includes('vancouver') ||
                event.venue.address.toLowerCase().includes('bc') ||
                (event.venue.city !== 'Toronto' && event.venue.city !== 'ON')
            );
            
            if (addressIssues.length > 0) {
                console.log(`\n⚠️  Found ${addressIssues.length} events with potential address issues:`);
                addressIssues.forEach(event => {
                    console.log(`   - ${event.name}: ${event.venue.address} (${event.venue.city}, ${event.venue.province})`);
                });
            } else {
                console.log(`\n✅ All events have Toronto addresses!`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing venue addresses:', error.message);
    }
}

testVenueAddressDetails();
