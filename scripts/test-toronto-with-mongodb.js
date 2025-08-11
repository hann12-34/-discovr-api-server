/**
 * TEST TORONTO SCRAPERS WITH PROPER MONGODB CONNECTION
 * 
 * Tests Toronto scrapers with the correct MongoDB URI environment variable set
 * to resolve the "Cannot read properties of undefined (reading 'startsWith')" 
 * error caused by missing MONGODB_URI.
 */

const path = require('path');
const fs = require('fs');

// Set the MongoDB URI from the working configuration
process.env.MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

const TORONTO_SCRAPERS_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// The 17 Toronto scrapers to test
const SCRAPERS_TO_TEST = [
    'scrape-moca-events.js',
    'scrape-ago-events-clean.js',  
    'scrape-rom-events-clean.js',
    'scrape-casa-loma-events-clean.js',
    'scrape-cn-tower-events-clean.js',
    'scrape-distillery-district-events-clean.js',
    'scrape-ontario-science-centre-events-clean.js',
    'scrape-toronto-zoo-events-clean.js',
    'scrape-ripley-aquarium-events-clean.js',
    'scrape-massey-hall-events-clean.js',
    'scrape-roy-thomson-hall-events-clean.js',
    'scrape-phoenix-concert-theatre-events-clean.js',
    'scrape-danforth-music-hall-events-clean.js',
    'scrape-opera-house-events-clean.js',
    'scrape-elgin-winter-garden-events-clean.js',
    'scrape-princess-of-wales-theatre-events-clean.js',
    'scrape-royal-alexandra-theatre-events-clean.js'
];

async function testSingleScraper(scraperFilename) {
    console.log(`\n🧪 Testing ${scraperFilename}...`);
    
    try {
        const scraperPath = path.join(TORONTO_SCRAPERS_DIR, scraperFilename);
        
        if (!fs.existsSync(scraperPath)) {
            return { status: 'missing', error: 'File not found' };
        }
        
        // Load the scraper module
        delete require.cache[require.resolve(scraperPath)]; // Clear cache
        const scraperModule = require(scraperPath);
        
        if (!scraperModule.scrape || typeof scraperModule.scrape !== 'function') {
            return { status: 'export_error', error: 'No scrape function exported' };
        }
        
        console.log(`   📁 Export type: Function-based`);
        
        // Test the scraper with timeout
        const timeout = 30000; // 30 seconds
        
        const result = await Promise.race([
            scraperModule.scrape('Toronto'),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout after 30s')), timeout)
            )
        ]);
        
        const eventCount = Array.isArray(result) ? result.length : 0;
        console.log(`   ✅ SUCCESS: Found ${eventCount} events`);
        
        return { 
            status: 'success', 
            eventCount,
            hasEvents: eventCount > 0 
        };
        
    } catch (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function testAllTorontoScrapers() {
    console.log('\n🧪 TESTING TORONTO SCRAPERS WITH MONGODB CONNECTION');
    console.log('=' .repeat(65));
    console.log('🎯 Goal: Test scrapers with proper MongoDB URI to find working ones');
    console.log(`🔌 MongoDB URI: ${process.env.MONGODB_URI.substring(0, 50)}...`);
    
    const results = {
        working: [],
        errors: [],
        missing: [],
        exportErrors: [],
        noEvents: []
    };
    
    console.log(`\n📁 Testing ${SCRAPERS_TO_TEST.length} Toronto scrapers...\n`);
    
    for (const scraperFilename of SCRAPERS_TO_TEST) {
        const result = await testSingleScraper(scraperFilename);
        result.filename = scraperFilename;
        
        switch (result.status) {
            case 'success':
                if (result.hasEvents) {
                    results.working.push(result);
                } else {
                    results.noEvents.push(result);
                }
                break;
            case 'error':
                results.errors.push(result);
                break;
            case 'missing':
                results.missing.push(result);
                break;
            case 'export_error':
                results.exportErrors.push(result);
                break;
        }
    }
    
    // Report results
    console.log(`\n📊 TORONTO SCRAPERS TEST RESULTS WITH MONGODB`);
    console.log('='.repeat(65));
    console.log(`✅ Working scrapers (with events): ${results.working.length}`);
    console.log(`🔍 Working scrapers (no events): ${results.noEvents.length}`);
    console.log(`❌ Error scrapers: ${results.errors.length}`);
    console.log(`🔧 Export error scrapers: ${results.exportErrors.length}`);
    console.log(`📁 Missing scrapers: ${results.missing.length}`);
    
    if (results.working.length > 0) {
        console.log('\n✅ SCRAPERS WITH EVENTS:');
        results.working.forEach(result => {
            console.log(`   🎉 ${result.filename}: ${result.eventCount} events`);
        });
    }
    
    if (results.noEvents.length > 0) {
        console.log('\n🔍 SCRAPERS WITH NO EVENTS (but working):');
        results.noEvents.forEach(result => {
            console.log(`   ⚪ ${result.filename}: 0 events`);
        });
    }
    
    if (results.errors.length > 0) {
        console.log('\n❌ SCRAPERS WITH ERRORS:');
        results.errors.forEach(result => {
            console.log(`   💥 ${result.filename}: ${result.error}`);
        });
    }
    
    const totalWorking = results.working.length + results.noEvents.length;
    const totalEvents = results.working.reduce((sum, r) => sum + r.eventCount, 0);
    
    if (totalWorking > 0) {
        console.log(`\n🎉 SUCCESS! ${totalWorking}/17 Toronto scrapers now working!`);
        console.log(`📈 Total events found: ${totalEvents}`);
        
        if (results.working.length > 0) {
            console.log('📊 These scrapers can expand Toronto event coverage beyond current 6 events');
            console.log('🚀 Ready to integrate working scrapers into production import');
        }
    } else {
        console.log('\n⚠️ No scrapers working - may need further debugging');
    }
    
    return results;
}

// Run test with MongoDB connection
testAllTorontoScrapers()
    .then((results) => {
        console.log('\n🏁 Toronto scrapers testing with MongoDB complete!');
        console.log(`🎯 ${results.working.length + results.noEvents.length} working scrapers identified`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
