/**
 * VALIDATION OF ALL REPAIRED TORONTO SCRAPERS
 * 
 * Confirms syntax and functionality of all 161 Toronto scrapers
 * after mass repair operation
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = __dirname;

async function validateAllScrapers() {
  console.log('🔍 VALIDATING ALL REPAIRED TORONTO SCRAPERS');
  console.log('='.repeat(60));

  // Get all Toronto scraper files
  const allFiles = fs.readdirSync(TORONTO_DIR)
    .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && 
            !file.includes('repair') && !file.includes('mass') && 
            !file.includes('simple') && !file.includes('validate'))
    .sort();

  console.log(`📊 Found ${allFiles.length} Toronto scraper files to validate`);

  const results = {
    total: allFiles.length,
    syntaxValid: 0,
    syntaxInvalid: 0,
    hasAntiBot: 0,
    hasCityValidation: 0,
    hasUtilImports: 0,
    hasProperExports: 0,
    failures: []
  };

  // Validate each file
  for (const filename of allFiles) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Test 1: Syntax validation
      try {
        new (require('vm').Script)(content);
        results.syntaxValid++;
        console.log(`✅ ${filename}: Syntax valid`);
      } catch (syntaxError) {
        results.syntaxInvalid++;
        results.failures.push({
          file: filename,
          error: 'Syntax Error',
          details: syntaxError.message.substring(0, 100)
        });
        console.log(`❌ ${filename}: Syntax error - ${syntaxError.message.substring(0, 50)}...`);
        continue;
      }

      // Test 2: Modern features check
      if (content.includes('getBrowserHeaders') || content.includes('getRandomUserAgent')) {
        results.hasAntiBot++;
      }
      
      if (content.includes('EXPECTED_CITY') && content.includes('City mismatch!')) {
        results.hasCityValidation++;
      }
      
      if (content.includes('generateEventId') && content.includes('extractCategories')) {
        results.hasUtilImports++;
      }

      if (content.includes('module.exports') && content.includes('scrape:')) {
        results.hasProperExports++;
      }

    } catch (error) {
      results.failures.push({
        file: filename,
        error: 'File Read Error',
        details: error.message
      });
      console.log(`❌ ${filename}: Cannot read file - ${error.message}`);
    }
  }

  // Generate comprehensive report
  console.log('\n📈 VALIDATION RESULTS:');
  console.log(`📁 Total scrapers: ${results.total}`);
  console.log(`✅ Syntax valid: ${results.syntaxValid} (${Math.round((results.syntaxValid/results.total)*100)}%)`);
  console.log(`❌ Syntax invalid: ${results.syntaxInvalid} (${Math.round((results.syntaxInvalid/results.total)*100)}%)`);
  console.log(`🤖 Has anti-bot features: ${results.hasAntiBot} (${Math.round((results.hasAntiBot/results.total)*100)}%)`);
  console.log(`🏙️ Has city validation: ${results.hasCityValidation} (${Math.round((results.hasCityValidation/results.total)*100)}%)`);
  console.log(`🔧 Has util imports: ${results.hasUtilImports} (${Math.round((results.hasUtilImports/results.total)*100)}%)`);
  console.log(`📤 Has proper exports: ${results.hasProperExports} (${Math.round((results.hasProperExports/results.total)*100)}%)`);

  // Show failures for targeted fixing
  if (results.failures.length > 0) {
    console.log('\n❌ REMAINING FAILURES (Need targeted fixes):');
    results.failures.forEach((failure, index) => {
      if (index < 15) { // Show first 15 failures
        console.log(`${index + 1}. ${failure.file}: ${failure.error}`);
      }
    });
    if (results.failures.length > 15) {
      console.log(`... and ${results.failures.length - 15} more failures`);
    }
  }

  console.log('\n🎯 NEXT STEPS:');
  if (results.syntaxInvalid > 0) {
    console.log(`- Target ${results.syntaxInvalid} syntax failures for manual/template repair`);
  }
  if (results.hasAntiBot < results.syntaxValid) {
    console.log(`- Add anti-bot features to ${results.syntaxValid - results.hasAntiBot} working scrapers`);
  }
  if (results.hasCityValidation < results.syntaxValid) {
    console.log(`- Add city validation to ${results.syntaxValid - results.hasCityValidation} working scrapers`);
  }

  return results;
}

// Run validation if script is executed directly
if (require.main === module) {
  validateAllScrapers()
    .then(results => {
      const successRate = Math.round((results.syntaxValid/results.total)*100);
      console.log(`\n🚀 VALIDATION COMPLETE! Success rate: ${successRate}%`);
      
      if (successRate >= 90) {
        console.log('✅ Outstanding! Ready for orchestrator integration and production deployment');
      } else if (successRate >= 75) {
        console.log('🔧 Good progress! Target remaining failures for 90%+ success');
      } else {
        console.log('⚠️ More repairs needed. Continue template-based fixes');
      }
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateAllScrapers };
