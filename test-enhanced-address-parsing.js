/**
 * Test enhanced address parsing with street numbers
 */

const TodoCanadaTorontoEvents = require('./scrapers/cities/Toronto/scrape-todocanada-toronto-events');

async function testEnhancedAddressParsing() {
    console.log('🧪 Testing enhanced address parsing with street numbers...\n');
    
    const scraper = new TodoCanadaTorontoEvents();
    
    // Test various address formats
    const testAddresses = [
        '123 Queen Street West, Toronto, ON',
        '45 Bay Street, Toronto',
        'Roy Thomson Hall, 60 Simcoe Street, Toronto, ON',
        'CN Tower, 290 Bremner Boulevard, Toronto, ON',
        'Casa Loma, 1 Austin Terrace, Toronto, ON',
        'Harbourfront Centre, 235 Queens Quay West, Toronto, ON',
        'Ripley\'s Aquarium, 288 Bremner Boulevard, Toronto, ON',
        'Art Gallery of Ontario, 317 Dundas Street West, Toronto, ON',
        'Princess of Wales Theatre, 300 King Street West, Toronto, ON',
        'Ontario Place, 955 Lakeshore Boulevard West, Toronto, ON',
        'Mississauga City Centre, 300 City Centre Drive, Mississauga, ON',
        'Vaughan Mills, 1 Bass Pro Mills Drive, Vaughan, ON',
        'Markham Civic Centre, 101 Town Centre Boulevard, Markham, ON',
        'Richmond Hill Centre, 10268 Yonge Street, Richmond Hill, ON',
        'Square One Shopping Centre, Mississauga, ON',
        'Toronto City Hall, Toronto, ON',
        'Harbourfront Centre, Toronto, ON'
    ];
    
    console.log('📍 Testing address parsing:');
    console.log('=' .repeat(80));
    
    for (const address of testAddresses) {
        const result = scraper.parseAddress(address);
        
        console.log(`\n🔍 Original: "${address}"`);
        console.log(`📍 Clean Address: "${result.cleanAddress}"`);
        console.log(`🏢 City: ${result.city}, Province: ${result.province}`);
        
        if (result.streetNumber) {
            console.log(`🏠 Street Number: ${result.streetNumber}`);
        }
        if (result.streetName) {
            console.log(`🛣️  Street Name: ${result.streetName}`);
        }
        if (result.fullStreetAddress) {
            console.log(`📮 Full Street Address: ${result.fullStreetAddress}`);
        }
        
        console.log('-'.repeat(60));
    }
    
    console.log('\n🎉 Address parsing test completed!');
}

testEnhancedAddressParsing().catch(console.error);
