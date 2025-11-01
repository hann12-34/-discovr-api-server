/**
 * DATA QUALITY ANALYSIS TOOL
 * Identifies and fixes scrapers producing poor quality event data
 */

const fs = require('fs');
const path = require('path');

// Test a few scrapers to identify data quality issues
const testScrapers = [
  { city: 'vancouver', file: 'ballotBC.js' },
  { city: 'vancouver', file: 'commodoreBallroom.js' },
  { city: 'vancouver', file: 'bcPlace.js' },
  { city: 'Toronto', file: 'horseshoeTavern.js' }
];

async function analyzeDataQuality() {
  console.log('🔍 ANALYZING DATA QUALITY ISSUES');
  console.log('================================\n');
  
  for (const scraper of testScrapers) {
    const scraperPath = path.join(__dirname, 'scrapers', 'cities', scraper.city, scraper.file);
    
    try {
      if (fs.existsSync(scraperPath)) {
        console.log(`🧪 Testing: ${scraper.file}`);
        
        const scraperModule = require(scraperPath);
        let events;
        
        if (typeof scraperModule === 'function') {
          events = await scraperModule(scraper.city);
        } else if (scraperModule.scrape) {
          events = await scraperModule.scrape(scraper.city);
        } else {
          console.log(`❌ ${scraper.file}: Export format issue`);
          continue;
        }
        
        console.log(`📊 Found ${events.length} events`);
        
        // Analyze first few events for quality issues
        events.slice(0, 3).forEach((event, i) => {
          console.log(`\n   Event ${i + 1}:`);
          console.log(`   Title: "${event.title}"`);
          console.log(`   Venue: "${event.venue}"`);
          console.log(`   URL: "${event.url}"`);
          
          // Check for quality issues
          const issues = [];
          if (event.title.includes('{') || event.title.includes('fill:') || event.title.includes('#')) {
            issues.push('🚨 CSS CODE DETECTED');
          }
          if (event.title.length < 5) {
            issues.push('⚠️ TITLE TOO SHORT');
          }
          if (event.title.includes('undefined') || event.title.includes('null')) {
            issues.push('🚨 UNDEFINED/NULL VALUES');
          }
          if (!event.venue || event.venue === 'undefined') {
            issues.push('❌ MISSING VENUE');
          }
          if (event.title.toLowerCase().includes('menu') || event.title.toLowerCase().includes('contact')) {
            issues.push('🗑️ NAVIGATION JUNK');
          }
          
          if (issues.length > 0) {
            console.log(`   ❌ ISSUES: ${issues.join(', ')}`);
          } else {
            console.log(`   ✅ LOOKS GOOD`);
          }
        });
        
        console.log(`\n`);
        
      } else {
        console.log(`❌ ${scraper.file}: File not found`);
      }
    } catch (error) {
      console.log(`❌ ${scraper.file}: Error - ${error.message}`);
    }
  }
  
  console.log('\n🎯 RECOMMENDED FIXES:');
  console.log('1. 🔧 Add CSS/technical content filters');
  console.log('2. 🏢 Fix venue attribution logic');
  console.log('3. 📝 Improve title extraction selectors');
  console.log('4. 🧹 Add title cleanup and validation');
  console.log('5. 🚫 Enhance skip terms and filtering');
}

analyzeDataQuality().catch(console.error);
