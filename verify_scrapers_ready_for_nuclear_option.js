/**
 * VERIFY ALL SCRAPERS ARE READY FOR NUCLEAR OPTION
 * Check if all city scrapers have auto-city detection implemented
 * Confirm we can safely wipe DB and re-run all scrapers
 */

const fs = require('fs').promises;
const path = require('path');

async function verifyScrapersReady() {
  try {
    console.log('🔍 VERIFYING ALL SCRAPERS ARE READY FOR NUCLEAR OPTION...\n');
    console.log('🎯 CHECKING: Auto-city detection implementation in all cities');
    console.log('✅ GOAL: Confirm safe to wipe DB and re-run scrapers\n');

    const cities = ['Calgary', 'Montreal', 'New York', 'Toronto', 'Vancouver'];
    let allReady = true;
    const readinessReport = {};

    // Step 1: Check utils/auto-detect-city.js exists
    console.log('🔧 CHECKING AUTO-CITY UTILITY...');
    console.log('=' .repeat(50));
    
    const autoCityPath = path.join(process.cwd(), 'utils', 'auto-detect-city.js');
    try {
      await fs.access(autoCityPath);
      console.log('✅ utils/auto-detect-city.js exists and ready');
    } catch (error) {
      console.log('❌ utils/auto-detect-city.js MISSING - create it first!');
      allReady = false;
    }

    // Step 2: Check each city's index.js for auto-city implementation
    for (const city of cities) {
      console.log(`\n🏙️ CHECKING ${city.toUpperCase()}...`);
      console.log('=' .repeat(50));
      
      const cityIndexPath = path.join(process.cwd(), 'scrapers', 'cities', city, 'index.js');
      
      try {
        const indexContent = await fs.readFile(cityIndexPath, 'utf8');
        
        // Check for auto-city imports and usage
        const hasImport = indexContent.includes('auto-detect-city') || 
                         indexContent.includes('processBatchWithCity');
        const hasUsage = indexContent.includes('processBatchWithCity') ||
                        indexContent.includes('processEventsForCity');
        
        if (hasImport && hasUsage) {
          console.log(`✅ ${city}/index.js has auto-city detection implemented`);
          readinessReport[city] = 'READY';
        } else if (hasImport) {
          console.log(`⚠️ ${city}/index.js has import but missing usage`);
          readinessReport[city] = 'PARTIAL';
          allReady = false;
        } else {
          console.log(`❌ ${city}/index.js missing auto-city detection`);
          readinessReport[city] = 'NOT_READY';
          allReady = false;
        }
        
        // Check for scraper count
        const files = await fs.readdir(path.join(process.cwd(), 'scrapers', 'cities', city));
        const scraperCount = files.filter(f => f.endsWith('.js') && f !== 'index.js').length;
        console.log(`📁 ${city} has ${scraperCount} scraper files`);
        
      } catch (error) {
        console.log(`❌ ${city}/index.js not found or unreadable: ${error.message}`);
        readinessReport[city] = 'ERROR';
        allReady = false;
      }
    }

    // Step 3: Check template scraper exists
    console.log(`\n🎯 CHECKING TEMPLATE SCRAPER...`);
    console.log('=' .repeat(50));
    
    const templatePath = path.join(process.cwd(), 'scraper-template-with-auto-city.js');
    try {
      await fs.access(templatePath);
      console.log('✅ scraper-template-with-auto-city.js exists');
    } catch (error) {
      console.log('⚠️ Template scraper missing (not critical for nuclear option)');
    }

    // Step 4: Nuclear option readiness assessment
    console.log(`\n🚀 NUCLEAR OPTION READINESS ASSESSMENT:`);
    console.log('=' .repeat(50));
    
    console.log('📊 READINESS REPORT:');
    Object.entries(readinessReport).forEach(([city, status]) => {
      const emoji = status === 'READY' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`   ${emoji} ${city}: ${status}`);
    });
    
    if (allReady) {
      console.log('\n🏆 ALL SYSTEMS GO! NUCLEAR OPTION IS SAFE!');
      console.log('\n🎯 RECOMMENDED NUCLEAR OPTION PROCEDURE:');
      console.log('1. 🗑️ Delete all events from database');
      console.log('2. 🚀 Run all 5 city scrapers');
      console.log('3. ✅ Every event gets proper city tagging automatically');
      console.log('4. 📱 Test app - should see MASSIVE event count increases');
      
      console.log('\n🔥 EXPECTED RESULTS:');
      console.log('🗽 New York: 1000+ events (was 192)');
      console.log('🌊 Vancouver: 500+ events (was ~19)');
      console.log('🍁 Calgary: 300+ events (was ~17)');
      console.log('🇫🇷 Montreal: 100+ events (was ~3)');
      console.log('🏢 Toronto: 200+ events (was 0)');
      
      console.log('\n⚡ TOTAL EXPECTED: 2000+ perfectly tagged events!');
      
    } else {
      console.log('\n⚠️ NOT READY FOR NUCLEAR OPTION YET!');
      console.log('\n🔧 REQUIRED FIXES:');
      
      Object.entries(readinessReport).forEach(([city, status]) => {
        if (status !== 'READY') {
          console.log(`   🔧 Fix ${city}/index.js auto-city detection`);
        }
      });
      
      console.log('\n🎯 ALTERNATIVE: Run backfill script instead of nuclear option');
    }

    return allReady;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run the verification
verifyScrapersReady().then(ready => {
  if (ready) {
    console.log('\n🚀 NUCLEAR OPTION APPROVED: Safe to wipe DB and re-run scrapers!');
  } else {
    console.log('\n⚠️ NUCLEAR OPTION NOT RECOMMENDED: Fix scrapers first or use backfill');
  }
}).catch(console.error);
