/**
 * Test script for newly created Montreal scrapers
 */

const DiesOnzeEvents = require('./scrapers/cities/Montreal/scrape-dies-onze');
const CleopatraMontrealEvents = require('./scrapers/cities/Montreal/scrape-cleopatra-montreal');
const MTLOrgEvents = require('./scrapers/cities/Montreal/scrape-mtl-org');
const LePointDeVenteEvents = require('./scrapers/cities/Montreal/scrape-lepointdevente');
const FoufounesElectriquesEvents = require('./scrapers/cities/Montreal/scrape-foufounes-electriques');
const LeBelmontEvents = require('./scrapers/cities/Montreal/scrape-le-belmont');

/**
 * Test newly created Montreal scrapers
 */
async function testNewMontrealScrapers() {
    console.log('🇨🇦 Testing New Montreal Event Scrapers...\n');
    
    const scrapers = [
        { name: 'Dies Onze', scraper: DiesOnzeEvents },
        { name: 'Cleopatra Montreal', scraper: CleopatraMontrealEvents },
        { name: 'MTL.org Events', scraper: MTLOrgEvents },
        { name: 'Le Point de Vente', scraper: LePointDeVenteEvents },
        { name: 'Foufounes Électriques', scraper: FoufounesElectriquesEvents },
        { name: 'Le Belmont', scraper: LeBelmontEvents }
    ];
    
    const results = [];
    
    for (const { name, scraper } of scrapers) {
        try {
            console.log(`\n🔍 Testing ${name}...`);
            console.log(`URL: ${scraper.url}`);
            console.log(`Enabled: ${scraper.enabled}`);
            
            const startTime = Date.now();
            const events = await scraper.scrape();
            const endTime = Date.now();
            
            const duration = (endTime - startTime) / 1000;
            
            console.log(`✅ ${name}: Found ${events.length} events (${duration.toFixed(2)}s)`);
            
            // Show sample event if any found
            if (events.length > 0) {
                const sampleEvent = events[0];
                console.log(`   Sample event: "${sampleEvent.title}"`);
                console.log(`   Date: ${sampleEvent.startDate}`);
                console.log(`   Categories: ${sampleEvent.categories.join(', ')}`);
                console.log(`   Venue: ${sampleEvent.venue.name}`);
                console.log(`   ID: ${sampleEvent.id}`);
                
                // Check for fallback events
                const fallbackEvents = events.filter(event => event.isFallback === true);
                if (fallbackEvents.length > 0) {
                    console.log(`   ⚠️  Warning: Found ${fallbackEvents.length} fallback events!`);
                }
                
                // Check for invalid dates
                const invalidDateEvents = events.filter(event => 
                    !event.startDate || !event.endDate || 
                    isNaN(new Date(event.startDate).getTime()) || 
                    isNaN(new Date(event.endDate).getTime())
                );
                if (invalidDateEvents.length > 0) {
                    console.log(`   ⚠️  Warning: Found ${invalidDateEvents.length} events with invalid dates!`);
                }
                
                // Check for missing titles
                const noTitleEvents = events.filter(event => !event.title || event.title.trim() === '');
                if (noTitleEvents.length > 0) {
                    console.log(`   ⚠️  Warning: Found ${noTitleEvents.length} events without titles!`);
                }
            }
            
            results.push({
                name,
                success: true,
                eventCount: events.length,
                duration,
                url: scraper.url,
                events: events.slice(0, 3) // Store first 3 events for inspection
            });
            
        } catch (error) {
            console.log(`❌ ${name}: Error - ${error.message}`);
            console.log(`   Stack: ${error.stack}`);
            
            results.push({
                name,
                success: false,
                error: error.message,
                url: scraper.url
            });
        }
    }
    
    return results;
}

// Test date parsing functions
async function testDateParsing() {
    console.log('\n🗓️ Testing Date Parsing...\n');
    
    const testDates = [
        '15 décembre 2024',
        'December 15, 2024',
        '15/12/2024',
        '2024-12-15',
        'Vendredi, 15 décembre 2024',
        'Friday, December 15th, 2024',
        '15 déc 2024 20h30',
        'Dec 15, 2024 8:30 PM'
    ];
    
    const scraper = DiesOnzeEvents; // Use one scraper for testing
    
    for (const dateString of testDates) {
        try {
            const result = scraper.parseDateRange(dateString);
            console.log(`"${dateString}" -> Start: ${result.startDate}, End: ${result.endDate}`);
        } catch (error) {
            console.log(`"${dateString}" -> Error: ${error.message}`);
        }
    }
}

// Test event ID generation
async function testEventIdGeneration() {
    console.log('\n🆔 Testing Event ID Generation...\n');
    
    const testEvents = [
        { title: 'Soirée Techno', date: new Date('2024-12-15') },
        { title: 'Concert de Jazz', date: new Date('2024-12-16') },
        { title: 'Party des Fêtes', date: new Date('2024-12-31') },
        { title: 'Événement Spécial', date: new Date('2024-01-01') }
    ];
    
    const scraper = DiesOnzeEvents;
    
    for (const event of testEvents) {
        const id = scraper.generateEventId(event.title, event.date);
        console.log(`"${event.title}" (${event.date.toISOString().split('T')[0]}) -> ${id}`);
    }
}

// Run the tests
if (require.main === module) {
    testNewMontrealScrapers()
        .then(results => {
            console.log('\n📊 Test Summary:');
            console.log('================');
            
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`✅ Successful: ${successful.length}`);
            console.log(`❌ Failed: ${failed.length}`);
            console.log(`📈 Total Events Found: ${successful.reduce((sum, r) => sum + r.eventCount, 0)}`);
            
            if (failed.length > 0) {
                console.log('\n❌ Failed Scrapers:');
                failed.forEach(result => {
                    console.log(`   - ${result.name}: ${result.error}`);
                });
            }
            
            // Run additional tests
            return testDateParsing();
        })
        .then(() => testEventIdGeneration())
        .then(() => {
            console.log('\n🎉 All tests completed!');
        })
        .catch(error => {
            console.error('Test runner error:', error);
        });
}
