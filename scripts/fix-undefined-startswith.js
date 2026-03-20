/**
 * CRITICAL FIX: Undefined startsWith Errors in Toronto Scrapers
 * 
 * Fixes the "Cannot read properties of undefined (reading 'startsWith')" 
 * error affecting all 17 Toronto scrapers by adding null checks before
 * calling startsWith() on potentially undefined values.
 */

const fs = require('fs');
const path = require('path');

// The 17 scrapers failing with undefined startsWith errors
const FAILING_SCRAPERS = [
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

const TORONTO_SCRAPERS_DIR = '/Users/seongwoo/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function fixScraperStartsWith(scraperFilename) {
    console.log(`\n🔧 Fixing ${scraperFilename}...`);
    
    try {
        const scraperPath = path.join(TORONTO_SCRAPERS_DIR, scraperFilename);
        
        if (!fs.existsSync(scraperPath)) {
            return { status: 'missing', error: 'File not found' };
        }
        
        let content = fs.readFileSync(scraperPath, 'utf8');
        let fixCount = 0;
        
        // Fix pattern 1: eventUrl.startsWith without null check
        const pattern1 = /eventUrl\.startsWith\(/g;
        if (content.match(pattern1)) {
            content = content.replace(
                /eventUrl\.startsWith\(/g,
                '(eventUrl && eventUrl.startsWith('
            );
            // Also need to add closing parenthesis
            content = content.replace(
                /(eventUrl && eventUrl\.startsWith\('http'\)) \? eventUrl : /g,
                '($1) ? eventUrl : '
            );
            fixCount++;
            console.log(`   ✅ Fixed eventUrl.startsWith() pattern`);
        }
        
        // Fix pattern 2: imageUrl.startsWith without null check
        const pattern2 = /imageUrl\.startsWith\(/g;
        if (content.match(pattern2)) {
            content = content.replace(
                /imageUrl\.startsWith\(/g,
                '(imageUrl && imageUrl.startsWith('
            );
            // Also need to add closing parenthesis  
            content = content.replace(
                /(imageUrl && imageUrl\.startsWith\('http'\)) \? imageUrl : /g,
                '($1) ? imageUrl : '
            );
            fixCount++;
            console.log(`   ✅ Fixed imageUrl.startsWith() pattern`);
        }
        
        // Fix pattern 3: url.startsWith without null check (generic)
        const pattern3 = /(\w+)\.startsWith\('http'\)/g;
        const originalContent = content;
        content = content.replace(pattern3, (match, varName) => {
            // Skip if already has null check
            if (content.includes(`${varName} && ${varName}.startsWith`)) {
                return match;
            }
            console.log(`   ✅ Fixed ${varName}.startsWith() pattern`);
            fixCount++;
            return `(${varName} && ${varName}.startsWith('http'))`;
        });
        
        // Fix specific problematic patterns found in scrapers
        
        // Pattern: eventUrl: eventUrl.startsWith('http') ? eventUrl : `${BASE_URL}${eventUrl}`
        content = content.replace(
            /eventUrl: eventUrl\.startsWith\('http'\) \? eventUrl : `\$\{BASE_URL\}\$\{eventUrl\}`/g,
            'eventUrl: (eventUrl && eventUrl.startsWith(\'http\')) ? eventUrl : `${BASE_URL}${eventUrl || \'\'}`'
        );
        
        // Pattern: imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`) : null
        content = content.replace(
            /imageUrl: imageUrl \? \(imageUrl\.startsWith\('http'\) \? imageUrl : `\$\{BASE_URL\}\$\{imageUrl\}`\) : null/g,
            'imageUrl: imageUrl ? ((imageUrl && imageUrl.startsWith(\'http\')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null'
        );
        
        // Write fixed content back
        if (fixCount > 0) {
            fs.writeFileSync(scraperPath, content, 'utf8');
            console.log(`   ✅ Applied ${fixCount} startsWith fixes`);
            return { status: 'fixed', fixCount };
        } else {
            console.log(`   ⏭️ No startsWith issues found`);
            return { status: 'no_issues' };
        }
        
    } catch (error) {
        console.log(`   ❌ Fix failed: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function fixAllUndefinedStartsWith() {
    console.log('\n🔧 FIXING UNDEFINED STARTSWITH ERRORS IN TORONTO SCRAPERS');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Fix "Cannot read properties of undefined" errors in all 17 scrapers');
    
    const results = {
        fixed: [],
        noIssues: [],
        missing: [],
        errors: []
    };
    
    console.log(`\n📁 Fixing ${FAILING_SCRAPERS.length} failing scrapers...\n`);
    
    for (const scraperFilename of FAILING_SCRAPERS) {
        const result = await fixScraperStartsWith(scraperFilename);
        result.filename = scraperFilename;
        
        switch (result.status) {
            case 'fixed':
                results.fixed.push(result);
                break;
            case 'no_issues':
                results.noIssues.push(result);
                break;
            case 'missing':
                results.missing.push(result);
                break;
            case 'error':
                results.errors.push(result);
                break;
        }
    }
    
    // Report results
    console.log(`\n📊 UNDEFINED STARTSWITH FIX RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Fixed scrapers: ${results.fixed.length}`);
    console.log(`⏭️ No issues found: ${results.noIssues.length}`);
    console.log(`📁 Missing files: ${results.missing.length}`);
    console.log(`❌ Fix errors: ${results.errors.length}`);
    
    if (results.fixed.length > 0) {
        console.log('\n✅ SUCCESSFULLY FIXED SCRAPERS:');
        results.fixed.forEach(result => {
            console.log(`   🔧 ${result.filename}: ${result.fixCount} fixes applied`);
        });
    }
    
    if (results.errors.length > 0) {
        console.log('\n❌ SCRAPERS WITH FIX ERRORS:');
        results.errors.forEach(result => {
            console.log(`   💥 ${result.filename}: ${result.error}`);
        });
    }
    
    const totalFixed = results.fixed.length;
    if (totalFixed > 0) {
        console.log(`\n🎉 SUCCESS! Fixed undefined startsWith errors in ${totalFixed} scrapers!`);
        console.log('📈 These scrapers should now work and provide more Toronto events');
        console.log('🧪 Ready to test and import additional Toronto events');
    } else {
        console.log('\n⚠️ No scrapers were fixed - may need manual inspection');
    }
    
    return results;
}

// Run fix
fixAllUndefinedStartsWith()
    .then((results) => {
        console.log('\n🏁 Undefined startsWith fix complete!');
        console.log(`🎯 ${results.fixed.length} scrapers fixed and ready for testing`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    });
