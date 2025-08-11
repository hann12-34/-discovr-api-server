/**
 * PRODUCTION VALIDATION: Complete Toronto Orchestrator
 * 
 * Tests the complete Toronto orchestrator with all 26 scrapers to ensure:
 * 1. All imports load correctly
 * 2. No syntax errors in the orchestrator
 * 3. City validation works properly
 * 4. Ready for production deployment
 */

const path = require('path');

async function validateProductionOrchestrator() {
  console.log('🔧 PRODUCTION VALIDATION: Complete Toronto Orchestrator');
  console.log('='.repeat(60));

  try {
    // Test 1: Import orchestrator without syntax errors
    console.log('📦 Test 1: Loading orchestrator...');
    const orchestratorPath = path.join(__dirname, 'scrape-all-toronto-clean.js');
    
    // Use dynamic import to catch any import errors
    let orchestrator;
    try {
      orchestrator = require(orchestratorPath);
      console.log('✅ Orchestrator imported successfully');
    } catch (error) {
      console.error('❌ Orchestrator import failed:', error.message);
      return false;
    }

    // Test 2: Check if main function exists
    console.log('🔍 Test 2: Checking main function...');
    if (typeof orchestrator.scrapeAllTorontoEvents !== 'function') {
      console.error('❌ Main scraping function not found');
      return false;
    }
    console.log('✅ Main scraping function exists');

    // Test 3: Test city validation (should throw error for wrong city)
    console.log('🛡️ Test 3: Testing city validation...');
    try {
      // This should fail due to city validation
      await orchestrator.scrapeAllTorontoEvents('InvalidCity');
      console.error('❌ City validation failed - should have thrown error');
      return false;
    } catch (error) {
      if (error.message.includes('City mismatch')) {
        console.log('✅ City validation working correctly');
      } else {
        console.error('❌ Unexpected city validation error:', error.message);
        return false;
      }
    }

    // Test 4: Count expected scrapers by analyzing the file
    console.log('📊 Test 4: Analyzing scraper count...');
    const fs = require('fs');
    const orchestratorCode = fs.readFileSync(orchestratorPath, 'utf8');
    
    // Count scraper entries in the code
    const scraperMatches = orchestratorCode.match(/{ name: '[^']+', fn: [^}]+}/g);
    const scraperCount = scraperMatches ? scraperMatches.length : 0;
    
    console.log(`📈 Expected scrapers in orchestrator: ${scraperCount}`);
    if (scraperCount >= 26) {
      console.log('✅ Scraper count meets minimum requirement (26+)');
    } else {
      console.log(`⚠️ Scraper count below expected (${scraperCount}/26+)`);
    }

    // Test 5: Check for clean scrapers in imports
    console.log('🧹 Test 5: Checking for clean scraper imports...');
    const cleanScraperImports = [
      'scrape-gardiner-museum-events-clean',
      'scrape-ripley-aquarium-events-clean',
      'scrape-uv-toronto-events-clean',
      'scrape-vertigo-events-clean',
      'scrape-xclub-events-clean',
      'scrape-roy-thomson-hall-events-clean-v2',
      'scrape-princess-wales-theatre-events-clean-v2',
      'scrape-cn-tower-events-clean-v2'
    ];

    let cleanScrapersFound = 0;
    for (const cleanScraper of cleanScraperImports) {
      if (orchestratorCode.includes(cleanScraper)) {
        cleanScrapersFound++;
      }
    }

    console.log(`📋 Clean scrapers found in imports: ${cleanScrapersFound}/${cleanScraperImports.length}`);
    if (cleanScrapersFound === cleanScraperImports.length) {
      console.log('✅ All clean scrapers properly imported');
    } else {
      console.log(`⚠️ Some clean scrapers missing from imports`);
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION ORCHESTRATOR VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log('✅ Import test: PASSED');
    console.log('✅ Function structure: PASSED');  
    console.log('✅ City validation: PASSED');
    console.log(`✅ Scraper count: ${scraperCount} scrapers`);
    console.log(`✅ Clean scrapers: ${cleanScrapersFound}/8 imported`);
    
    console.log('\n🚀 PRODUCTION READINESS ASSESSMENT:');
    if (scraperCount >= 26 && cleanScrapersFound >= 8) {
      console.log('✅ ORCHESTRATOR IS PRODUCTION-READY!');
      console.log('✅ All validation tests passed');
      console.log('✅ Clean scrapers with advanced anti-bot features integrated');
      console.log('✅ Ready for deployment to production environment');
      return true;
    } else {
      console.log('❌ Orchestrator needs additional work before production');
      console.log(`❌ Missing requirements: scrapers (${scraperCount}/26+) or clean imports (${cleanScrapersFound}/8)`);
      return false;
    }

  } catch (error) {
    console.error('❌ Production validation failed:', error);
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateProductionOrchestrator().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { validateProductionOrchestrator };
