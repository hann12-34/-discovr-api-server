/**
 * CRITICAL CORRECTIVE FIX: Repair Syntax Errors from Previous Fix
 * 
 * Fixes the "Unexpected token ':'" syntax errors introduced by 
 * mismatched parentheses in the previous startsWith fix.
 */

const fs = require('fs');
const path = require('path');

// The 16 scrapers with syntax errors from my previous fix
const BROKEN_SCRAPERS = [
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

async function fixScraperSyntax(scraperFilename) {
    console.log(`\n🔧 Fixing syntax in ${scraperFilename}...`);
    
    try {
        const scraperPath = path.join(TORONTO_SCRAPERS_DIR, scraperFilename);
        
        if (!fs.existsSync(scraperPath)) {
            return { status: 'missing', error: 'File not found' };
        }
        
        let content = fs.readFileSync(scraperPath, 'utf8');
        let fixCount = 0;
        
        // Fix 1: eventUrl line with missing closing parenthesis
        // BROKEN: eventUrl: ((eventUrl && eventUrl.startsWith('http')) ? eventUrl : `${BASE_URL}${eventUrl}`,
        // FIXED:  eventUrl: (eventUrl && eventUrl.startsWith('http')) ? eventUrl : `${BASE_URL}${eventUrl}`,
        const eventUrlPattern = /eventUrl: \(\(eventUrl && eventUrl\.startsWith\('http'\)\) \? eventUrl : `\$\{BASE_URL\}\$\{eventUrl\}`,/g;
        if (content.match(eventUrlPattern)) {
            content = content.replace(
                eventUrlPattern,
                'eventUrl: (eventUrl && eventUrl.startsWith(\'http\')) ? eventUrl : `${BASE_URL}${eventUrl}`,');
            fixCount++;
            console.log(`   ✅ Fixed eventUrl parentheses`);
        }
        
        // Fix 2: imageUrl line with too many opening parentheses
        // BROKEN: imageUrl: imageUrl ? (((imageUrl && imageUrl.startsWith('http')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,
        // FIXED:  imageUrl: imageUrl ? ((imageUrl && imageUrl.startsWith('http')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,
        const imageUrlPattern = /imageUrl: imageUrl \? \(\(\(imageUrl && imageUrl\.startsWith\('http'\)\) \? imageUrl : `\$\{BASE_URL\}\$\{imageUrl\}`\) : null,/g;
        if (content.match(imageUrlPattern)) {
            content = content.replace(
                imageUrlPattern,
                'imageUrl: imageUrl ? ((imageUrl && imageUrl.startsWith(\'http\')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,');
            fixCount++;
            console.log(`   ✅ Fixed imageUrl parentheses`);
        }
        
        // Additional pattern fixes for any other broken patterns
        
        // Fix generic double parentheses at start of conditions
        content = content.replace(
            /\(\((\w+ && \w+\.startsWith\('http'\))\)/g,
            '($1)'
        );
        
        // Fix triple parentheses around imageUrl
        content = content.replace(
            /\(\(\(imageUrl && imageUrl\.startsWith\('http'\)\)/g,
            '(imageUrl && imageUrl.startsWith(\'http\'))'
        );
        
        // Write fixed content back
        if (fixCount > 0) {
            fs.writeFileSync(scraperPath, content, 'utf8');
            console.log(`   ✅ Applied ${fixCount} syntax fixes`);
            return { status: 'fixed', fixCount };
        } else {
            console.log(`   ⏭️ No syntax issues found (already fixed?)`);
            return { status: 'no_issues' };
        }
        
    } catch (error) {
        console.log(`   ❌ Fix failed: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function fixAllSyntaxErrors() {
    console.log('\n🔧 FIXING SYNTAX ERRORS FROM PREVIOUS STARTSWITH FIX');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Repair mismatched parentheses causing "Unexpected token" errors');
    
    const results = {
        fixed: [],
        noIssues: [],
        missing: [],
        errors: []
    };
    
    console.log(`\n📁 Fixing ${BROKEN_SCRAPERS.length} broken scrapers...\n`);
    
    for (const scraperFilename of BROKEN_SCRAPERS) {
        const result = await fixScraperSyntax(scraperFilename);
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
    console.log(`\n📊 SYNTAX ERROR FIX RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Fixed scrapers: ${results.fixed.length}`);
    console.log(`⏭️ No issues found: ${results.noIssues.length}`);
    console.log(`📁 Missing files: ${results.missing.length}`);
    console.log(`❌ Fix errors: ${results.errors.length}`);
    
    if (results.fixed.length > 0) {
        console.log('\n✅ SUCCESSFULLY FIXED SCRAPERS:');
        results.fixed.forEach(result => {
            console.log(`   🔧 ${result.filename}: ${result.fixCount} syntax fixes applied`);
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
        console.log(`\n🎉 SUCCESS! Fixed syntax errors in ${totalFixed} scrapers!`);
        console.log('📈 These scrapers should now load and run without syntax errors');
        console.log('🧪 Ready to re-test Toronto scrapers');
    } else {
        console.log('\n⚠️ No scrapers were fixed - they may already be working');
    }
    
    return results;
}

// Run corrective fix
fixAllSyntaxErrors()
    .then((results) => {
        console.log('\n🏁 Syntax error fix complete!');
        console.log(`🎯 ${results.fixed.length} scrapers fixed and ready for re-testing`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    });
