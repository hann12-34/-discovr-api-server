/**
 * URL Audit Script
 * Checks all city scrapers to ensure they properly set the `url` field for events
 */

const fs = require('fs');
const path = require('path');

const CITIES = ['Vancouver', 'Toronto', 'Montreal', 'New York', 'Calgary'];

console.log('🔍 SCRAPER URL AUDIT\n');
console.log('═══════════════════════════════════════════\n');

let totalScrapers = 0;
let scrapersWithoutURL = [];
let scrapersWithURL = [];

CITIES.forEach(city => {
    const cityPath = path.join(__dirname, 'scrapers', 'cities', city);
    
    if (!fs.existsSync(cityPath)) {
        console.log(`⚠️  ${city} directory not found`);
        return;
    }
    
    console.log(`\n📍 ${city}:`);
    
    const files = fs.readdirSync(cityPath).filter(f => 
        (f.startsWith('scrape-') || f.includes('scraper')) && 
        f.endsWith('.js') && 
        !f.includes('template') &&
        !f.includes('backup')
    );
    
    files.forEach(file => {
        totalScrapers++;
        const filePath = path.join(cityPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if scraper sets url field
        const hasURLField = content.includes('url:') || content.includes('url =');
        const hasURLProperty = /url\s*[:=]\s*['"$]/.test(content);
        
        if (hasURLField || hasURLProperty) {
            scrapersWithURL.push(`${city}/${file}`);
            console.log(`  ✅ ${file}`);
        } else {
            scrapersWithoutURL.push(`${city}/${file}`);
            console.log(`  ❌ ${file} - MISSING URL`);
        }
    });
});

console.log('\n═══════════════════════════════════════════');
console.log('📊 AUDIT SUMMARY:');
console.log(`   Total Scrapers: ${totalScrapers}`);
console.log(`   ✅ With URL: ${scrapersWithURL.length} (${Math.round(scrapersWithURL.length/totalScrapers*100)}%)`);
console.log(`   ❌ Missing URL: ${scrapersWithoutURL.length} (${Math.round(scrapersWithoutURL.length/totalScrapers*100)}%)`);

if (scrapersWithoutURL.length > 0) {
    console.log('\n⚠️  SCRAPERS MISSING URL FIELD:');
    scrapersWithoutURL.forEach(s => console.log(`   - ${s}`));
}

console.log('═══════════════════════════════════════════');
