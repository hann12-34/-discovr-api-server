#!/usr/bin/env node

// Test scrapers incrementally to build working list
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;

// Start with known working scrapers
const workingScrapers = [
    'arcDiningEvents.js',
    'artGalleryEvents.js', 
    'bardOnTheBeachEvents.js',
    'chanCentre.js',
    'cherryBlossomFestEvents.js',
    'chineseGardenEvents.js',
    'coastalJazzEvents.js',
    'contemporaryArtGalleryEvents.js',
    'cultureCrawlEvents.js',
    'danceFestivalEvents.js'
];

async function testScraper(scraperFile) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', scraperFile);
    
    if (!fs.existsSync(scraperPath)) {
        return { success: false, error: 'File not found' };
    }
    
    try {
        console.log(`🔄 Testing ${scraperFile}...`);
        const scraper = require(scraperPath);
        
        if (typeof scraper !== 'function') {
            return { success: false, error: 'Not a function' };
        }
        
        // Test with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
        );
        
        const scraperPromise = scraper('Vancouver');
        const events = await Promise.race([scraperPromise, timeoutPromise]);
        
        if (!events || !Array.isArray(events)) {
            return { success: false, error: 'No events returned' };
        }
        
        return { 
            success: true, 
            eventCount: events.length,
            hasValidDates: events.some(e => e.startDate && !isNaN(new Date(e.startDate)))
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message.split('\n')[0].substring(0, 100)
        };
    }
}

async function findMoreWorkingScrapers() {
    const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
    const allScrapers = fs.readdirSync(scrapersDir)
        .filter(file => file.endsWith('.js'))
        .filter(file => !workingScrapers.includes(file))
        .slice(0, 30); // Test 30 more scrapers
    
    console.log(`🧪 Testing ${allScrapers.length} additional scrapers...\n`);
    
    const newWorkingScrapers = [];
    
    for (const scraperFile of allScrapers) {
        const result = await testScraper(scraperFile);
        
        if (result.success) {
            newWorkingScrapers.push(scraperFile);
            console.log(`✅ ${scraperFile}: ${result.eventCount} events`);
        } else {
            console.log(`❌ ${scraperFile}: ${result.error}`);
        }
    }
    
    const totalWorking = workingScrapers.length + newWorkingScrapers.length;
    
    console.log(`\n📊 INCREMENTAL TEST RESULTS:`);
    console.log(`✅ Previously working: ${workingScrapers.length}`);
    console.log(`✅ New working scrapers: ${newWorkingScrapers.length}`);
    console.log(`🎯 Total working scrapers: ${totalWorking}`);
    
    if (newWorkingScrapers.length > 0) {
        console.log(`\n📝 NEW WORKING SCRAPERS TO ADD:`);
        newWorkingScrapers.forEach(file => console.log(`    '${file}',`));
        
        const allWorkingScrapers = [...workingScrapers, ...newWorkingScrapers];
        
        console.log(`\n📋 UPDATED SCRAPER LIST (${allWorkingScrapers.length} total):`);
        console.log('const reliableScrapers = [');
        allWorkingScrapers.forEach(file => console.log(`    '${file}',`));
        console.log('];');
    }
    
    return newWorkingScrapers;
}

if (require.main === module) {
    findMoreWorkingScrapers();
}

module.exports = { findMoreWorkingScrapers };
