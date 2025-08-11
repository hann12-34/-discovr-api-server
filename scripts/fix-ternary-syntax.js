/**
 * FINAL CORRECTIVE FIX: Repair Ternary Operator Syntax
 * 
 * Fixes the "Unexpected token ')'" errors caused by improper 
 * ternary operator nesting in the imageUrl lines.
 */

const fs = require('fs');
const path = require('path');

// The 16 scrapers with ternary syntax errors
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

async function fixTernarySyntax(scraperFilename) {
    console.log(`\n🔧 Fixing ternary syntax in ${scraperFilename}...`);
    
    try {
        const scraperPath = path.join(TORONTO_SCRAPERS_DIR, scraperFilename);
        
        if (!fs.existsSync(scraperPath)) {
            return { status: 'missing', error: 'File not found' };
        }
        
        let content = fs.readFileSync(scraperPath, 'utf8');
        let fixCount = 0;
        
        // Fix the broken imageUrl ternary syntax
        // BROKEN: imageUrl: imageUrl ? (imageUrl && imageUrl.startsWith('http')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,
        // FIXED:  imageUrl: imageUrl ? ((imageUrl && imageUrl.startsWith('http')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,
        const brokenPattern = /imageUrl: imageUrl \? \(imageUrl && imageUrl\.startsWith\('http'\)\) \? imageUrl : `\$\{BASE_URL\}\$\{imageUrl\}`\) : null,/g;
        if (content.match(brokenPattern)) {
            content = content.replace(
                brokenPattern,
                'imageUrl: imageUrl ? ((imageUrl && imageUrl.startsWith(\'http\')) ? imageUrl : `${BASE_URL}${imageUrl}`) : null,'
            );
            fixCount++;
            console.log(`   ✅ Fixed imageUrl ternary syntax`);
        }
        
        // Also fix any similar patterns with different variable names
        const genericBrokenPattern = /(\w+): \1 \? \(\1 && \1\.startsWith\('http'\)\) \? \1 : `\$\{BASE_URL\}\$\{\1\}`\) : null,/g;
        content = content.replace(genericBrokenPattern, (match, varName) => {
            console.log(`   ✅ Fixed ${varName} ternary syntax`);
            fixCount++;
            return `${varName}: ${varName} ? ((${varName} && ${varName}.startsWith('http')) ? ${varName} : \`\${BASE_URL}\${${varName}}\`) : null,`;
        });
        
        // Write fixed content back
        if (fixCount > 0) {
            fs.writeFileSync(scraperPath, content, 'utf8');
            console.log(`   ✅ Applied ${fixCount} ternary fixes`);
            return { status: 'fixed', fixCount };
        } else {
            console.log(`   ⏭️ No ternary issues found (already fixed?)`);
            return { status: 'no_issues' };
        }
        
    } catch (error) {
        console.log(`   ❌ Fix failed: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function fixAllTernaryErrors() {
    console.log('\n🔧 FIXING TERNARY OPERATOR SYNTAX ERRORS');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Fix "Unexpected token \')\'" errors in imageUrl ternary operators');
    
    const results = {
        fixed: [],
        noIssues: [],
        missing: [],
        errors: []
    };
    
    console.log(`\n📁 Fixing ${BROKEN_SCRAPERS.length} broken scrapers...\n`);
    
    for (const scraperFilename of BROKEN_SCRAPERS) {
        const result = await fixTernarySyntax(scraperFilename);
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
    console.log(`\n📊 TERNARY SYNTAX FIX RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Fixed scrapers: ${results.fixed.length}`);
    console.log(`⏭️ No issues found: ${results.noIssues.length}`);
    console.log(`📁 Missing files: ${results.missing.length}`);
    console.log(`❌ Fix errors: ${results.errors.length}`);
    
    if (results.fixed.length > 0) {
        console.log('\n✅ SUCCESSFULLY FIXED SCRAPERS:');
        results.fixed.forEach(result => {
            console.log(`   🔧 ${result.filename}: ${result.fixCount} ternary fixes applied`);
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
        console.log(`\n🎉 SUCCESS! Fixed ternary syntax errors in ${totalFixed} scrapers!`);
        console.log('📈 These scrapers should now have valid JavaScript syntax');
        console.log('🧪 Ready to re-test Toronto scrapers once more');
    } else {
        console.log('\n⚠️ No scrapers were fixed - they may already have correct syntax');
    }
    
    return results;
}

// Run final corrective fix
fixAllTernaryErrors()
    .then((results) => {
        console.log('\n🏁 Ternary syntax fix complete!');
        console.log(`🎯 ${results.fixed.length} scrapers fixed and ready for final testing`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    });
