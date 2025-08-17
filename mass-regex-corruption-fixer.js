#!/usr/bin/env node

/**
 * Mass Regex Corruption Fixer
 * Fixes unterminated regex groups across all city scrapers
 */

const fs = require('fs');
const path = require('path');

// Corruption patterns to fix
const CORRUPTION_FIXES = [
    {
        pattern: /\/\(\\d\{4\}-\\d\{2\}-\\d\{2\}\//g,
        replacement: '/(\\d{4}-\\d{2}-\\d{2})/',
        description: 'Fix unterminated ISO date regex group'
    },
    {
        pattern: /\/\(\\\w\+\)\\\s\+\(\\\d\{1,2\},\?\\\s\+\(\\\d\{4\}\)\/\//g,
        replacement: '/(\\w+)\\s+(\\d{1,2},?\\s+(\\d{4})/',
        description: 'Fix double slash date format regex'
    },
    {
        pattern: /\/\(\\\d\{1,2\}\\\/\(\\\d\{1,2\}\\\/\(\\\d\{4\}/g,
        replacement: '/(\\d{1,2}\\/(\\d{1,2}\\/(\\d{4})/',
        description: 'Fix unterminated numeric date regex'
    }
];

// Cities to scan
const CITIES = ['Calgary', 'Montreal', 'Toronto', 'New York'];

function fixFileCorruption(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let fixed = false;
        
        CORRUPTION_FIXES.forEach(fix => {
            if (fix.pattern.test(content)) {
                content = content.replace(fix.pattern, fix.replacement);
                fixed = true;
                console.log(`🔧 Fixed ${fix.description} in ${path.basename(filePath)}`);
            }
        });
        
        if (fixed) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
        return false;
    }
}

function scanAndFixCity(cityPath) {
    if (!fs.existsSync(cityPath)) {
        console.log(`⚠️ City path not found: ${cityPath}`);
        return { scanned: 0, fixed: 0 };
    }
    
    const files = fs.readdirSync(cityPath);
    let scanned = 0;
    let fixed = 0;
    
    files.forEach(file => {
        if (file.endsWith('.js') && file !== 'index.js') {
            const filePath = path.join(cityPath, file);
            scanned++;
            
            if (fixFileCorruption(filePath)) {
                fixed++;
            }
        }
    });
    
    return { scanned, fixed };
}

async function main() {
    console.log('🚀 Starting Mass Regex Corruption Fixer...\n');
    
    let totalScanned = 0;
    let totalFixed = 0;
    
    for (const city of CITIES) {
        const cityPath = path.join(__dirname, 'scrapers', 'cities', city);
        console.log(`🔍 Scanning ${city} scrapers...`);
        
        const result = scanAndFixCity(cityPath);
        totalScanned += result.scanned;
        totalFixed += result.fixed;
        
        console.log(`✅ ${city}: ${result.fixed}/${result.scanned} files fixed\n`);
    }
    
    console.log('🎉 Mass Regex Corruption Fix Complete!');
    console.log(`📊 Total: ${totalFixed}/${totalScanned} files fixed`);
    
    if (totalFixed > 0) {
        console.log('\n🧪 Testing city orchestrators...');
        
        for (const city of CITIES) {
            try {
                const cityModule = require(`./scrapers/cities/${city}/index.js`);
                console.log(`✅ ${city} orchestrator loads successfully`);
            } catch (error) {
                console.error(`❌ ${city} orchestrator error:`, error.message);
            }
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, fixFileCorruption, scanAndFixCity };
