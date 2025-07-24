const ArtsCommonsEvents = require('./scrapers/cities/Calgary/scrape-arts-commons');
const CalgaryStampedeEvents = require('./scrapers/cities/Calgary/scrape-calgary-stampede');
const PalaceTheatreEvents = require('./scrapers/cities/Calgary/scrape-palace-theatre');
const SledIslandEvents = require('./scrapers/cities/Calgary/scrape-sled-island');
const CalgaryZooEvents = require('./scrapers/cities/Calgary/scrape-calgary-zoo');
const HeritageParkEvents = require('./scrapers/cities/Calgary/scrape-heritage-park');
const GreyEagleCasinoEvents = require('./scrapers/cities/Calgary/scrape-grey-eagle-casino');
const BellaConcertHallEvents = require('./scrapers/cities/Calgary/scrape-bella-concert-hall');
const SaddledomeEvents = require('./scrapers/cities/Calgary/scrape-saddledome');
const JubileeAuditoriumEvents = require('./scrapers/cities/Calgary/scrape-jubilee-auditorium');
const StudioBellEvents = require('./scrapers/cities/Calgary/scrape-studio-bell');
const TheatreCalgaryEvents = require('./scrapers/cities/Calgary/scrape-theatre-calgary');
const ComedyCaveEvents = require('./scrapers/cities/Calgary/scrape-comedy-cave');
const CalgaryFolkFestivalEvents = require('./scrapers/cities/Calgary/scrape-calgary-folk-festival');
const MacHallConcertsEvents = require('./scrapers/cities/Calgary/scrape-mac-hall-concerts');
const GlenbowMuseumEvents = require('./scrapers/cities/Calgary/scrape-glenbow-museum');
const WinSportEvents = require('./scrapers/cities/Calgary/scrape-winsport');
const SpruceMeadowsEvents = require('./scrapers/cities/Calgary/scrape-spruce-meadows');
const CalgaryPhilharmonicEvents = require('./scrapers/cities/Calgary/scrape-calgary-philharmonic');
const CowboyMusicFestivalEvents = require('./scrapers/cities/Calgary/scrape-cowboy-music-festival');
const BanffLakeLouiseEvents = require('./scrapers/cities/Calgary/scrape-banff-lake-louise-events');
const CanmoreEvents = require('./scrapers/cities/Calgary/scrape-canmore-events');
const SkiLouiseEvents = require('./scrapers/cities/Calgary/scrape-ski-louise-events');

/**
 * Test suite for Calgary scrapers
 */
async function testCalgaryScrapers() {
    console.log('🏔️  TESTING CALGARY SCRAPERS');
    console.log('=' .repeat(60));
    
    const scrapers = [
        { name: 'Arts Commons', scraper: new ArtsCommonsEvents() },
        { name: 'Calgary Stampede', scraper: new CalgaryStampedeEvents() },
        { name: 'Palace Theatre', scraper: new PalaceTheatreEvents() },
        { name: 'Sled Island', scraper: new SledIslandEvents() },
        { name: 'Calgary Zoo', scraper: new CalgaryZooEvents() },
        { name: 'Heritage Park', scraper: new HeritageParkEvents() },
        { name: 'Grey Eagle Casino', scraper: new GreyEagleCasinoEvents() },
        { name: 'Bella Concert Hall', scraper: new BellaConcertHallEvents() },
        { name: 'Scotiabank Saddledome', scraper: new SaddledomeEvents() },
        { name: 'Jubilee Auditorium', scraper: new JubileeAuditoriumEvents() },
        { name: 'Studio Bell', scraper: new StudioBellEvents() },
        { name: 'Theatre Calgary', scraper: new TheatreCalgaryEvents() },
        { name: 'Comedy Cave', scraper: new ComedyCaveEvents() },
        { name: 'Calgary Folk Festival', scraper: new CalgaryFolkFestivalEvents() },
        { name: 'Mac Hall Concerts', scraper: new MacHallConcertsEvents() },
        { name: 'Glenbow Museum', scraper: new GlenbowMuseumEvents() },
        { name: 'WinSport', scraper: new WinSportEvents() },
        { name: 'Spruce Meadows', scraper: new SpruceMeadowsEvents() },
        { name: 'Calgary Philharmonic', scraper: new CalgaryPhilharmonicEvents() },
        { name: 'Cowboy Music Festival', scraper: new CowboyMusicFestivalEvents() },
        { name: 'Banff Lake Louise', scraper: new BanffLakeLouiseEvents() },
        { name: 'Canmore Events', scraper: new CanmoreEvents() },
        { name: 'Ski Louise Events', scraper: new SkiLouiseEvents() }
    ];
    
    let totalEvents = 0;
    const results = [];
    
    for (const { name, scraper } of scrapers) {
        try {
            console.log(`\n🔍 Testing ${name}...`);
            const startTime = Date.now();
            const events = await scraper.scrapeEvents();
            const duration = Date.now() - startTime;
            
            results.push({
                name,
                events: events.length,
                duration,
                success: true,
                sampleEvents: events.slice(0, 2)
            });
            
            totalEvents += events.length;
            console.log(`✅ ${name}: ${events.length} events in ${duration}ms`);
            
            // Show sample events
            if (events.length > 0) {
                console.log(`   Sample events:`);
                events.slice(0, 2).forEach((event, index) => {
                    console.log(`   ${index + 1}. ${event.title} - ${event.date ? event.date.toDateString() : 'TBD'}`);
                });
            }
            
        } catch (error) {
            results.push({
                name,
                events: 0,
                duration: 0,
                success: false,
                error: error.message
            });
            
            console.log(`❌ ${name}: Error - ${error.message}`);
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🏔️  CALGARY SCRAPERS SUMMARY');
    console.log('='.repeat(60));
    
    const successfulScrapers = results.filter(r => r.success);
    const failedScrapers = results.filter(r => !r.success);
    
    console.log(`✅ Successful scrapers: ${successfulScrapers.length}/${results.length}`);
    console.log(`📅 Total events found: ${totalEvents}`);
    console.log(`⏱️  Average response time: ${Math.round(successfulScrapers.reduce((sum, r) => sum + r.duration, 0) / successfulScrapers.length)}ms`);
    
    if (failedScrapers.length > 0) {
        console.log(`\n❌ Failed scrapers:`);
        failedScrapers.forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\n📊 Individual Results:');
    results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} ${r.name}: ${r.events} events`);
    });
    
    return results;
}

// Run tests
if (require.main === module) {
    testCalgaryScrapers().then(() => {
        console.log('\n🎉 Calgary scrapers test completed!');
    }).catch(error => {
        console.error('❌ Test suite failed:', error);
    });
}

module.exports = testCalgaryScrapers;
