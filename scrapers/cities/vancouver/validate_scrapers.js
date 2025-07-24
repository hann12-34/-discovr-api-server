/**
 * Quick Vancouver Scraper Validation
 * 
 * This script quickly validates that scrapers can be imported 
 * and have the expected structure without actually running them.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DIRECTORY = __dirname;
const LOG_FILE = 'scraper_validation.json';

// Find all potential scraper files (excluding test files and utility scripts)
const getPotentialScrapers = () => {
  return fs.readdirSync(DIRECTORY)
    .filter(file => file.endsWith('.js') && 
                   !file.startsWith('test_') &&
                   !file.startsWith('test-') &&
                   !file.startsWith('run_') && 
                   !file.startsWith('fix_') &&
                   !file.startsWith('standardize_') &&
                   !file.startsWith('validate_') &&
                   !file.startsWith('master_') &&
                   !file.startsWith('verify-'));
};

// Main function
async function main() {
  console.log('🔍 Validating Vancouver scrapers structure...');
  
  const potentialScrapers = getPotentialScrapers();
  console.log(`Found ${potentialScrapers.length} potential scrapers to validate\n`);
  
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: potentialScrapers.length,
      valid: 0,
      invalid: 0
    },
    scrapers: []
  };
  
  // Process each scraper
  for (const file of potentialScrapers) {
    const filePath = path.join(DIRECTORY, file);
    const result = {
      file,
      valid: false,
      hasInstance: false,
      hasScrapeMethod: false,
      error: null
    };
    
    try {
      // Try to import the scraper
      const scraper = require(filePath);
      
      // Check if it's an instance (has properties)
      result.hasInstance = typeof scraper === 'object' && scraper !== null;
      
      // Check if it has a scrape method
      result.hasScrapeMethod = typeof scraper.scrape === 'function';
      
      // Mark as valid if it meets all requirements
      result.valid = result.hasInstance && result.hasScrapeMethod;
      
      // Update summary
      if (result.valid) {
        results.summary.valid++;
        console.log(`✅ ${file} - Valid scraper`);
      } else {
        results.summary.invalid++;
        const issues = [];
        if (!result.hasInstance) issues.push("not an instance");
        if (!result.hasScrapeMethod) issues.push("no scrape method");
        console.log(`❌ ${file} - Invalid: ${issues.join(", ")}`);
      }
    } catch (error) {
      result.error = error.message;
      results.summary.invalid++;
      console.log(`❌ ${file} - Error: ${error.message}`);
    }
    
    results.scrapers.push(result);
  }
  
  // Save results to file
  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n📊 Validation Summary:');
  console.log(`Total scrapers validated: ${results.summary.total}`);
  console.log(`Valid scrapers: ${results.summary.valid}`);
  console.log(`Invalid scrapers: ${results.summary.invalid}`);
  console.log(`\nDetailed results saved to ${LOG_FILE}`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
