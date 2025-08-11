/**
 * Test Remaining Toronto Scrapers
 * 
 * Systematically tests the remaining 17 "confirmed working" Toronto scrapers
 * that failed during import to identify specific issues and fix them.
 * Goal: Expand Toronto events beyond just 6.
 */

const fs = require('fs');
const path = require('path');

// The remaining 17 scrapers that failed during import
const REMAINING_SCRAPERS = [
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

const TORONTO_SCRAPERS_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function testRemainingScraper(scraperFilename) {
    console.log(`\n🧪 Testing ${scraperFilename}...`);
    
    try {
        const scraperPath = path.join(TORONTO_SCRAPERS_DIR, scraperFilename);
        
        // Check if file exists
        if (!fs.existsSync(scraperPath)) {
            return { status: 'missing', error: 'File not found' };
        }
        
        // Try to load the scraper module
        delete require.cache[require.resolve(scraperPath)]; // Clear cache
        const scraperModule = require(scraperPath);
        
        // Test different export structures
        let events = [];
        let testResult = {};
        
        if (scraperModule.scrape && typeof scraperModule.scrape === 'function') {
            // Function-based export: { scrape: function }
            console.log(`   📁 Export type: Function-based`);
            try {
                events = await scraperModule.scrape('Toronto');
                testResult = { 
                    status: 'success', 
                    exportType: 'function',
                    eventCount: events ? events.length : 0,
                    events: events || []
                };
            } catch (scrapeError) {
                testResult = { 
                    status: 'scrape_error', 
                    exportType: 'function',
                    error: scrapeError.message 
                };
            }
        } else if (typeof scraperModule === 'function') {
            // Class-based export: module.exports = Class
            console.log(`   📁 Export type: Class-based`);
            try {
                const scraper = new scraperModule();
                events = await scraper.scrape();
                testResult = { 
                    status: 'success', 
                    exportType: 'class',
                    eventCount: events ? events.length : 0,
                    events: events || []
                };
            } catch (scrapeError) {
                testResult = { 
                    status: 'scrape_error', 
                    exportType: 'class',
                    error: scrapeError.message 
                };
            }
        } else {
            testResult = { 
                status: 'unknown_export', 
                error: 'Unknown export structure',
                moduleKeys: Object.keys(scraperModule)
            };
        }
        
        // Log results
        if (testResult.status === 'success') {
            console.log(`   ✅ SUCCESS: Found ${testResult.eventCount} events`);
            if (testResult.eventCount > 0) {
                console.log(`   📝 Sample event: "${testResult.events[0]?.title || 'No title'}"`);
            }
        } else {
            console.log(`   ❌ FAILED: ${testResult.error}`);
        }
        
        return testResult;
        
    } catch (error) {
        console.log(`   ❌ LOAD ERROR: ${error.message}`);
        return { status: 'load_error', error: error.message };
    }
}

async function testRemainingTorontoScrapers() {
    console.log('\n🧪 TESTING REMAINING TORONTO SCRAPERS');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Find working scrapers to expand beyond 6 Toronto events');
    
    const results = {
        success: [],
        scrapeError: [],
        loadError: [],
        missing: [],
        unknownExport: []
    };
    
    console.log(`\n📁 Testing ${REMAINING_SCRAPERS.length} remaining scrapers...\n`);
    
    for (const scraperFilename of REMAINING_SCRAPERS) {
        const result = await testRemainingScraper(scraperFilename);
        result.filename = scraperFilename;
        
        // Categorize results
        switch (result.status) {
            case 'success':
                results.success.push(result);
                break;
            case 'scrape_error':
                results.scrapeError.push(result);
                break;
            case 'load_error':
                results.loadError.push(result);
                break;
            case 'missing':
                results.missing.push(result);
                break;
            case 'unknown_export':
                results.unknownExport.push(result);
                break;
        }
    }
    
    // Report results
    console.log(`\n📊 TORONTO SCRAPERS TEST RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Working scrapers: ${results.success.length}`);
    console.log(`❌ Scrape errors: ${results.scrapeError.length}`);
    console.log(`🔧 Load errors: ${results.loadError.length}`);
    console.log(`📁 Missing files: ${results.missing.length}`);
    console.log(`❓ Unknown exports: ${results.unknownExport.length}`);
    
    let totalNewEvents = 0;
    
    if (results.success.length > 0) {
        console.log('\n✅ WORKING SCRAPERS:');
        results.success.forEach(result => {
            console.log(`   📝 ${result.filename}: ${result.eventCount} events`);
            totalNewEvents += result.eventCount;
        });
        console.log(`\n🎉 POTENTIAL NEW EVENTS: ${totalNewEvents}`);
    }
    
    if (results.scrapeError.length > 0) {
        console.log('\n❌ SCRAPERS WITH SCRAPING ERRORS (fixable):');
        results.scrapeError.forEach(result => {
            console.log(`   🔧 ${result.filename}: ${result.error}`);
        });
    }
    
    if (results.loadError.length > 0) {
        console.log('\n🔧 SCRAPERS WITH LOAD ERRORS (syntax issues):');
        results.loadError.forEach(result => {
            console.log(`   ❌ ${result.filename}: ${result.error}`);
        });
    }
    
    console.log('\n🎯 NEXT STEPS:');
    if (results.success.length > 0) {
        console.log(`   1. Import ${totalNewEvents} events from ${results.success.length} working scrapers`);
    }
    if (results.scrapeError.length > 0) {
        console.log(`   2. Fix scraping errors in ${results.scrapeError.length} scrapers`);
    }
    if (results.loadError.length > 0) {
        console.log(`   3. Fix syntax/load errors in ${results.loadError.length} scrapers`);
    }
    
    return results;
}

// Run test
testRemainingTorontoScrapers()
    .then((results) => {
        console.log('\n🏁 Toronto scrapers testing complete!');
        console.log(`📈 Potential to expand from 6 to ${6 + results.success.reduce((sum, r) => sum + r.eventCount, 0)} Toronto events`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Testing failed:', error.message);
        process.exit(1);
    });
