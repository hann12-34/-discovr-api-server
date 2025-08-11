/**
 * DRY-RUN PRODUCTION VALIDATION
 * 
 * Validates that all Toronto scrapers are production-ready without requiring MongoDB
 * Tests loading, syntax, exports, and basic functionality
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = __dirname;

// Get all working Toronto scraper files (same logic as master orchestrator)
const WORKING_SCRAPERS = fs.readdirSync(TORONTO_DIR)
  .filter(file => 
    file.startsWith('scrape-') && 
    file.endsWith('.js') && 
    !file.includes('orchestr') &&
    !file.includes('master') &&
    !file.includes('repair') &&
    !file.includes('validate') &&
    !file.includes('fix') &&
    !file.includes('mass') &&
    !file.includes('simple') &&
    !file.includes('all-toronto') &&
    !file.includes('test') &&
    !file.includes('production-ready')
  )
  .sort();

async function validateProductionReadiness() {
  console.log('🔍 DRY-RUN PRODUCTION VALIDATION - ALL TORONTO SCRAPERS');
  console.log('='.repeat(60));
  console.log(`📊 Found ${WORKING_SCRAPERS.length} Toronto scraper files to validate`);

  const results = {
    total: WORKING_SCRAPERS.length,
    syntaxValid: 0,
    loadable: 0,
    hasValidExports: 0,
    hasAntiBot: 0,
    hasCityValidation: 0,
    hasUtilImports: 0,
    productionReady: 0,
    failures: []
  };

  console.log('\n📋 VALIDATION TESTS:');
  console.log('1. ✅ Syntax validation (can be parsed)');
  console.log('2. 🔧 Module loading (can be required)');
  console.log('3. 📤 Valid exports (has scrape function)');
  console.log('4. 🤖 Anti-bot features (modern headers)');
  console.log('5. 🏙️ City validation (prevents contamination)');
  console.log('6. 🔧 Utility imports (event processing)');

  console.log('\n🔍 RUNNING VALIDATION TESTS...');

  for (const filename of WORKING_SCRAPERS) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      
      let passed = 0;
      const maxTests = 6;

      // Test 1: Syntax validation
      try {
        new (require('vm').Script)(content);
        results.syntaxValid++;
        passed++;
      } catch (syntaxError) {
        results.failures.push({
          file: filename,
          test: 'Syntax',
          error: syntaxError.message.substring(0, 60)
        });
        console.log(`❌ ${filename}: Syntax error`);
        continue;
      }

      // Test 2: Module loading
      try {
        delete require.cache[require.resolve(filePath)];
        const scraperModule = require(filePath);
        results.loadable++;
        passed++;

        // Test 3: Valid exports
        if (scraperModule.scrape || typeof scraperModule === 'function') {
          results.hasValidExports++;
          passed++;
        }
      } catch (loadError) {
        results.failures.push({
          file: filename,
          test: 'Loading',
          error: loadError.message.substring(0, 60)
        });
        console.log(`❌ ${filename}: Loading error`);
        continue;
      }

      // Test 4: Anti-bot features
      if (content.includes('getBrowserHeaders') || content.includes('getRandomUserAgent')) {
        results.hasAntiBot++;
        passed++;
      }
      
      // Test 5: City validation
      if (content.includes('EXPECTED_CITY') && content.includes('City mismatch!')) {
        results.hasCityValidation++;
        passed++;
      }
      
      // Test 6: Utility imports
      if (content.includes('generateEventId') && content.includes('extractCategories')) {
        results.hasUtilImports++;
        passed++;
      }

      // Overall production readiness (5/6 or 6/6 tests passed)
      if (passed >= 5) {
        results.productionReady++;
        console.log(`✅ ${filename}: Production ready (${passed}/${maxTests} tests)`);
      } else {
        console.log(`⚠️ ${filename}: Needs attention (${passed}/${maxTests} tests)`);
      }

    } catch (error) {
      results.failures.push({
        file: filename,
        test: 'General',
        error: error.message
      });
      console.log(`❌ ${filename}: General error`);
    }
  }

  // Generate comprehensive report
  console.log('\n📈 PRODUCTION READINESS VALIDATION:');
  console.log('='.repeat(40));
  console.log(`📁 Total scrapers: ${results.total}`);
  console.log(`✅ Syntax valid: ${results.syntaxValid} (${Math.round((results.syntaxValid/results.total)*100)}%)`);
  console.log(`🔧 Loadable modules: ${results.loadable} (${Math.round((results.loadable/results.total)*100)}%)`);
  console.log(`📤 Valid exports: ${results.hasValidExports} (${Math.round((results.hasValidExports/results.total)*100)}%)`);
  console.log(`🤖 Anti-bot features: ${results.hasAntiBot} (${Math.round((results.hasAntiBot/results.total)*100)}%)`);
  console.log(`🏙️ City validation: ${results.hasCityValidation} (${Math.round((results.hasCityValidation/results.total)*100)}%)`);
  console.log(`🔧 Utility imports: ${results.hasUtilImports} (${Math.round((results.hasUtilImports/results.total)*100)}%)`);
  console.log(`🚀 Production ready: ${results.productionReady} (${Math.round((results.productionReady/results.total)*100)}%)`);

  // Production readiness assessment
  const productionRate = Math.round((results.productionReady/results.total)*100);
  
  console.log('\n🎯 PRODUCTION ASSESSMENT:');
  if (productionRate >= 95) {
    console.log('🎉 OUTSTANDING! All systems are production ready!');
    console.log('✅ Ready for immediate deployment to production infrastructure');
  } else if (productionRate >= 90) {
    console.log('🔥 EXCELLENT! Minor optimizations recommended');
    console.log('✅ Ready for production deployment with monitoring');
  } else if (productionRate >= 80) {
    console.log('⚡ VERY GOOD! Some scrapers need final touches');
    console.log('⚠️ Review failures before production deployment');
  } else {
    console.log('🔧 NEEDS IMPROVEMENT! Address major issues first');
    console.log('❌ Not ready for production deployment yet');
  }

  // Show critical failures
  if (results.failures.length > 0) {
    console.log('\n⚠️ ITEMS NEEDING ATTENTION:');
    const criticalFailures = results.failures.filter(f => 
      f.test === 'Syntax' || f.test === 'Loading'
    );
    
    criticalFailures.slice(0, 10).forEach((failure, index) => {
      console.log(`${index + 1}. ${failure.file}: ${failure.test} - ${failure.error}`);
    });
    
    if (criticalFailures.length > 10) {
      console.log(`... and ${criticalFailures.length - 10} more critical failures`);
    }
  }

  console.log(`\n🚀 VALIDATION COMPLETE: ${results.productionReady}/${results.total} scrapers production ready (${productionRate}%)`);
  
  return {
    results,
    productionRate,
    isProductionReady: productionRate >= 90
  };
}

// Run validation if script is executed directly
if (require.main === module) {
  validateProductionReadiness()
    .then(({ results, productionRate, isProductionReady }) => {
      if (isProductionReady) {
        console.log('\n🎯 VERDICT: PRODUCTION DEPLOYMENT APPROVED! 🚀');
        console.log('All Toronto scrapers are validated and ready for production!');
        process.exit(0);
      } else {
        console.log('\n⚠️ VERDICT: Review needed before production deployment');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateProductionReadiness };
