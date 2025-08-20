#!/usr/bin/env node

// Batch fix common syntax errors in Vancouver scrapers
const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

// Common fixes to apply
const fixes = [
    // Fix undefined city variable
    { pattern: /city: city,/g, replacement: "city: 'Vancouver'," },
    
    // Fix unterminated regex patterns
    { pattern: /\/\([^)]*\?\:\s*@\s*\(/g, replacement: '/\\([^)]*\\?\\:\\s*@\\s*\\(' },
    
    // Fix missing closing parentheses in common patterns
    { pattern: /new Date\(([^)]+)(?!\))/g, replacement: 'new Date($1)' },
    
    // Fix template literal issues
    { pattern: /\$\{([^}]+)(?!\})/g, replacement: '${$1}' },
    
    // Fix missing commas in object literals
    { pattern: /(\w+):\s*'([^']*)'(?=\s*\w+:)/g, replacement: "$1: '$2'," },
    
    // Fix missing closing brackets in array/object literals
    { pattern: /\[\s*([^[\]]*[^,\s])\s*(?!\])/g, replacement: '[$1]' }
];

async function fixScraper(scraperPath) {
    try {
        let content = fs.readFileSync(scraperPath, 'utf8');
        const originalContent = content;
        let fixesApplied = 0;
        
        // Apply each fix
        for (const fix of fixes) {
            const beforeLength = content.length;
            content = content.replace(fix.pattern, fix.replacement);
            if (content.length !== beforeLength) {
                fixesApplied++;
            }
        }
        
        // Test if the scraper can now load
        const tempPath = scraperPath + '.temp';
        fs.writeFileSync(tempPath, content);
        
        try {
            // Try to require the fixed scraper
            delete require.cache[require.resolve(tempPath)];
            require(tempPath);
            
            // If successful, save the fixed version
            fs.writeFileSync(scraperPath, content);
            fs.unlinkSync(tempPath);
            
            return { 
                success: true, 
                fixesApplied,
                message: `Fixed ${fixesApplied} issues` 
            };
        } catch (requireError) {
            // Revert if still broken
            fs.unlinkSync(tempPath);
            fs.writeFileSync(scraperPath, originalContent);
            
            return { 
                success: false, 
                fixesApplied: 0,
                message: `Still broken after fixes: ${requireError.message.split('\n')[0]}` 
            };
        }
        
    } catch (error) {
        return { 
            success: false, 
            fixesApplied: 0,
            message: `Error processing: ${error.message}` 
        };
    }
}

async function batchFixScrapers() {
    const scraperFiles = fs.readdirSync(scrapersDir)
        .filter(file => file.endsWith('.js'))
        .filter(file => !file.includes('_clean') && !file.includes('_corrupted'))
        .slice(0, 15); // Fix first 15 scrapers
    
    console.log(`🔧 Batch fixing ${scraperFiles.length} scrapers...\n`);
    
    const results = {
        fixed: [],
        stillBroken: [],
        errors: []
    };
    
    for (const file of scraperFiles) {
        const scraperPath = path.join(scrapersDir, file);
        const result = await fixScraper(scraperPath);
        
        if (result.success) {
            results.fixed.push(file);
            console.log(`✅ ${file}: ${result.message}`);
        } else {
            results.stillBroken.push(file);
            console.log(`❌ ${file}: ${result.message}`);
        }
    }
    
    console.log(`\n📊 BATCH FIX SUMMARY:`);
    console.log(`✅ Fixed: ${results.fixed.length} scrapers`);
    console.log(`❌ Still broken: ${results.stillBroken.length} scrapers`);
    
    if (results.fixed.length > 0) {
        console.log(`\n🎯 FIXED SCRAPERS:`);
        results.fixed.forEach(file => console.log(`   - ${file}`));
        
        // Generate new reliable scrapers list
        const cleanScrapers = [
            'bcPlaceStadiumEvents_clean.js',
            'capilanoSuspensionBridgeEvents_clean.js', 
            'grouseMountainEvents_clean.js',
            'vanAqmEvents_clean.js',
            'vanDusenGardenEvents_clean.js'
        ];
        
        const newReliableScrapers = [...cleanScrapers, ...results.fixed];
        
        console.log(`\n📝 NEW RELIABLE SCRAPERS LIST (${newReliableScrapers.length} total):`);
        newReliableScrapers.forEach(file => console.log(`   '${file}',`));
    }
    
    return results;
}

if (require.main === module) {
    batchFixScrapers();
}

module.exports = { batchFixScrapers };
