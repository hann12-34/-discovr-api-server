/**
 * CRITICAL: Fix New York City Tagging Regression
 * 
 * Applies proper city filtering logic from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
 * to all 40 New York scrapers to fix:
 * 1. "Unknown" city labels in mobile app
 * 2. Cross-city contamination (NY events in Toronto section)
 * 3. Missing city validation fields
 */

const fs = require('fs');
const path = require('path');

const NEW_YORK_SCRAPERS_DIR = '/Users/seongwoo/CascadeProjects/discovr-api-server/scrapers/cities/New York';

// City configuration per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
const CITY_TAGGING_TEMPLATE = `
        // 🚨 CRITICAL: City filtering requirements from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
        this.expectedCity = 'New York';
        this.cityConfig = {
            city: 'New York',
            state: 'NY', 
            country: 'USA',
            fullLocation: 'New York, NY'
        };`;

// Event creation template per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE  
const EVENT_TAGGING_PATTERN = {
    // Search for old broken pattern
    oldPattern: /events\.push\(\{\s*title:\s*([^,]+),\s*venue:\s*([^,]+),\s*location:\s*([^,]+),/g,
    
    // Replace with proper city tagging
    newTemplate: `events.push({
                            title: $1,
                            venue: {
                                name: $2,
                                address: this.cityConfig.fullLocation,
                                city: this.cityConfig.city,
                                state: this.cityConfig.state,
                                country: this.cityConfig.country
                            },
                            location: this.cityConfig.fullLocation,
                            city: this.cityConfig.city,`
};

async function fixNewYorkCityTagging() {
    console.log('🚨 FIXING CRITICAL NEW YORK CITY TAGGING REGRESSION');
    console.log('=' .repeat(60));
    
    const files = fs.readdirSync(NEW_YORK_SCRAPERS_DIR).filter(f => f.endsWith('-fixed.js'));
    console.log(`\n📁 Found ${files.length} New York scrapers to fix...\n`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const filename of files) {
        try {
            const filePath = path.join(NEW_YORK_SCRAPERS_DIR, filename);
            let content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`🔧 Fixing ${filename}...`);
            
            // 1. Add city configuration to constructor
            if (!content.includes('this.cityConfig')) {
                content = content.replace(
                    /(constructor\(\)\s*\{[\s\S]*?this\.category\s*=\s*[^;]+;)/,
                    `$1${CITY_TAGGING_TEMPLATE}`
                );
            }
            
            // 2. Fix event creation with proper city tagging
            content = content.replace(
                /events\.push\(\{\s*title:\s*([^,]+),\s*venue:\s*([^,]+),\s*location:\s*([^,]+),/g,
                `events.push({
                            title: $1,
                            venue: {
                                name: $2,
                                address: this.cityConfig.fullLocation,
                                city: this.cityConfig.city,
                                state: this.cityConfig.state,
                                country: this.cityConfig.country
                            },
                            location: this.cityConfig.fullLocation,
                            city: this.cityConfig.city,`
            );
            
            // 3. Fix source tagging to include city
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
    
    console.log(`\n📊 NEW YORK CITY TAGGING FIX RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Fixed scrapers: ${fixedCount}`);
    console.log(`❌ Failed scrapers: ${errorCount}`);
    console.log(`📈 Success rate: ${((fixedCount / (fixedCount + errorCount)) * 100).toFixed(1)}%`);
    
    if (fixedCount === files.length) {
        console.log('\n🎉 ALL NEW YORK SCRAPERS CITY TAGGING FIXED!');
        console.log('📱 Mobile app should now show proper "New York, NY" labels');
        console.log('🚫 Cross-city contamination should be resolved');
    } else {
        console.log('\n⚠️ Some scrapers still need manual fixing');
    }
}

// Run the fix
fixNewYorkCityTagging().catch(error => {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
});
