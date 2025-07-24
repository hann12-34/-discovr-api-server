/**
 * Test live address extraction with street numbers from TodoCanada
 */

const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function testLiveAddressExtraction() {
    console.log('🚀 Testing live address extraction with street numbers...\n');
    
    const scraper = new TodoCanadaTorontoEvents();
    
    try {
        const events = await scraper.fetchEvents();
        
        console.log(`📊 Found ${events.length} events from TodoCanada Toronto`);
        console.log('=' .repeat(80));
        
        // Show first 5 events with enhanced address information
        const sampleEvents = events.slice(0, 5);
        
        for (const event of sampleEvents) {
            console.log(`\n🎭 Event: ${event.name}`);
            console.log(`🏛️  Venue: ${event.venue.name}`);
            console.log(`📍 Address: ${event.venue.address}`);
            console.log(`🏢 City: ${event.venue.city}, Province: ${event.venue.province}`);
            
            if (event.venue.streetNumber) {
                console.log(`🏠 Street Number: ${event.venue.streetNumber}`);
            }
            if (event.venue.streetName) {
                console.log(`🛣️  Street Name: ${event.venue.streetName}`);
            }
            if (event.venue.fullStreetAddress) {
                console.log(`📮 Full Street Address: ${event.venue.fullStreetAddress}`);
            }
            if (event.venue.postalCode) {
                console.log(`📬 Postal Code: ${event.venue.postalCode}`);
            }
            
            console.log('-'.repeat(60));
        }
        
        // Count events with street numbers
        const eventsWithStreetNumbers = events.filter(event => event.venue.streetNumber);
        const eventsWithStreetNames = events.filter(event => event.venue.streetName);
        const eventsWithPostalCodes = events.filter(event => event.venue.postalCode);
        
        console.log(`\n📈 Summary:`);
        console.log(`📊 Total events: ${events.length}`);
        console.log(`🏠 Events with street numbers: ${eventsWithStreetNumbers.length} (${(eventsWithStreetNumbers.length / events.length * 100).toFixed(1)}%)`);
        console.log(`🛣️  Events with street names: ${eventsWithStreetNames.length} (${(eventsWithStreetNames.length / events.length * 100).toFixed(1)}%)`);
        console.log(`📬 Events with postal codes: ${eventsWithPostalCodes.length} (${(eventsWithPostalCodes.length / events.length * 100).toFixed(1)}%)`);
        
        // Show some examples of street numbers found
        if (eventsWithStreetNumbers.length > 0) {
            console.log(`\n🏠 Examples of street numbers found:`);
            eventsWithStreetNumbers.slice(0, 3).forEach((event, index) => {
                console.log(`${index + 1}. ${event.venue.streetNumber} ${event.venue.streetName} - ${event.name}`);
            });
        }
        
        console.log('\n✅ Live address extraction test completed!');
        
    } catch (error) {
        console.error('❌ Error testing live address extraction:', error.message);
    }
}

testLiveAddressExtraction();
