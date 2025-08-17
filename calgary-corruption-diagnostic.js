#!/usr/bin/env node

/**
 * Calgary Corruption Diagnostic
 * Tests each Calgary scraper individually to isolate corruption
 */

const fs = require('fs');
const path = require('path');

const CALGARY_SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'Calgary');

function testScraper(scraperFile) {
    try {
        const scraperPath = path.join(CALGARY_SCRAPERS_DIR, scraperFile);
        require(scraperPath);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function main() {
    console.log('🔍 Calgary Corruption Diagnostic Starting...\n');
    
    const files = fs.readdirSync(CALGARY_SCRAPERS_DIR);
    const scraperFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
    
    let totalTested = 0;
    let corrupted = 0;
    let corruptedFiles = [];
    
    for (const file of scraperFiles) {
        totalTested++;
        const result = testScraper(file);
        
        if (result.success) {
            console.log(`✅ ${file}`);
        } else {
            console.error(`❌ ${file}: ${result.error}`);
            corrupted++;
            corruptedFiles.push({ file, error: result.error });
        }
    }
    
    console.log(`\n📊 Calgary Diagnostic Complete:`);
    console.log(`🎯 Total tested: ${totalTested}`);
    console.log(`❌ Corrupted: ${corrupted}`);
    console.log(`✅ Clean: ${totalTested - corrupted}`);
    
    if (corruptedFiles.length > 0) {
        console.log(`\n🚨 CORRUPTED FILES:`);
        corruptedFiles.forEach(({ file, error }) => {
            console.log(`   • ${file}: ${error}`);
        });
    }
}

if (require.main === module) {
    main();
}
