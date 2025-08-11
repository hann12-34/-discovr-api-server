/**
 * CRITICAL: Fix Toronto City Tagging Regression
 * 
 * Applies proper city filtering logic from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
 * to all Toronto scrapers to fix:
 * 1. "Unknown" city labels in mobile app
 * 2. Cross-city contamination prevention
 * 3. Missing city validation fields
 * 
 * Following the same proven approach that fixed New York scrapers.
 */

const fs = require('fs');
const path = require('path');

const TORONTO_SCRAPERS_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

// City configuration per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
const CITY_TAGGING_TEMPLATE = `
        // 🚨 CRITICAL: City filtering requirements from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
        this.expectedCity = 'Toronto';
        this.cityConfig = {
            city: 'Toronto',
            province: 'ON', 
            country: 'Canada',
            fullLocation: 'Toronto, ON'
        };`;

async function fixTorontoCityTagging() {
    console.log('🚨 FIXING CRITICAL TORONTO CITY TAGGING REGRESSION');
    console.log('=' .repeat(60));
    
    const files = fs.readdirSync(TORONTO_SCRAPERS_DIR).filter(f => f.endsWith('.js') && !f.includes('test') && !f.includes('clean') && !f.includes('backup'));
    console.log(`\n📁 Found ${files.length} Toronto scrapers to fix...\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const filename of files) {
        try {
            const filePath = path.join(TORONTO_SCRAPERS_DIR, filename);
            let content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`🔧 Analyzing ${filename}...`);
            
            // Skip if already has city config
            if (content.includes('this.cityConfig')) {
                console.log(`⏭️ ${filename}: Already has city config - skipped`);
                skippedCount++;
                continue;
            }
            
            // Skip if no constructor found
            if (!content.includes('constructor()')) {
                console.log(`⏭️ ${filename}: No constructor found - skipped`);
                skippedCount++;
                continue;
            }
            
            // 1. Add city configuration to constructor
            content = content.replace(
                /(constructor\(\)\s*\{[\s\S]*?)(this\.[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]+;)(\s*\})/,
                `$1$2${CITY_TAGGING_TEMPLATE}$3`
            );
            
            // 2. Fix event creation with proper city tagging
            content = content.replace(
                /events\.push\(\{\s*title:\s*([^,]+),\s*venue:\s*([^,]+),\s*location:\s*([^,]+),/g,
                `events.push({
                            title: $1,
                            venue: {
                                name: $2,
                                address: this.cityConfig.fullLocation,
                                city: this.cityConfig.city,
                                province: this.cityConfig.province,
                                country: this.cityConfig.country
                            },
                            location: this.cityConfig.fullLocation,
                            city: this.cityConfig.city,`
            );
            
            // 3. Fix alternative event push patterns
            content = content.replace(
                /events\.push\(\s*\{\s*id:\s*([^,]+),\s*title:\s*([^,]+),\s*venue:\s*([^,]+),\s*location:\s*([^,]+),/g,
                `events.push({
                            id: $1,
                            title: $2,
                            venue: {
                                name: $3,
                                address: this.cityConfig.fullLocation,
                                city: this.cityConfig.city,
                                province: this.cityConfig.province,
                                country: this.cityConfig.country
                            },
                            location: this.cityConfig.fullLocation,
                            city: this.cityConfig.city,`
            );
            
            // 4. Fix source tagging to include city
            content = content.replace(
                /source:\s*'([^']+)'/g,
                `source: '$1-' + this.cityConfig.city`
            );
            
            // Write fixed content back
            fs.writeFileSync(filePath, content, 'utf8');
            
            console.log(`✅ ${filename}: City tagging fixed`);
            fixedCount++;
            
        } catch (error) {
            console.log(`❌ ${filename}: Error - ${error.message}`);
            errorCount++;
        }
    }
    
    console.log(`\n📊 TORONTO CITY TAGGING FIX RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Fixed scrapers: ${fixedCount}`);
    console.log(`⏭️ Skipped scrapers: ${skippedCount}`);
    console.log(`❌ Failed scrapers: ${errorCount}`);
    console.log(`📈 Success rate: ${((fixedCount / (fixedCount + errorCount + skippedCount)) * 100).toFixed(1)}%`);
    
    if (fixedCount > 0) {
        console.log('\n🎉 TORONTO SCRAPERS CITY TAGGING UPDATED!');
        console.log('📱 Mobile app should now show proper "Toronto, ON" labels');
        console.log('🚫 Cross-city contamination should be prevented');
    } else {
        console.log('\n⚠️ No scrapers needed fixing or all already had proper city tagging');
    }
}

// Run the fix
fixTorontoCityTagging().catch(error => {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
});
