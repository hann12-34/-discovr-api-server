const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Standardize Vancouver Scrapers Exports
 * 
 * This script checks all potential scraper files and standardizes their exports
 * to ensure they all export an instance rather than a class definition.
 */

const fs = require('fs');
const path = require('path');

// Directory where scrapers are stored
const SCRAPERS_DIR = __dirname;

// Potential scrapers (files that might contain scraper classes)
// We're including files that have "Events" in their name and don't start with "test-"
const getPotentialScrapers = () => {
  return fs.readdirSync(SCRAPERS_DIR)
    .filter(file => {
      return file.endsWith('.js') && 
             !file.startsWith('test-') &&
             !file.startsWith('fix_') &&
             !file.startsWith('standardize_') &&
             !file.startsWith('master_');
    });
};

// Check if a file exports a class or an instance
const checkExportFormat = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for module.exports patterns
  const exportsClass = /module\.exports\s*=\s*[A-Z][a-zA-Z0-9]*;/.test(content);
  const exportsInstance = /module\.exports\s*=\s*new\s+[A-Z][a-zA-Z0-9]*\(\);/.test(content);
  
  return {
    exportsClass,
    exportsInstance
  };
};

// Fix export format to standardize to exporting an instance
const fixExportFormat = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Get the class name (assuming it's in a format like "module.exports = ClassName;")
  const match = content.match(/module\.exports\s*=\s*([A-Z][a-zA-Z0-9]*);/);
  if (!match) {
    return false;
  }
  
  const className = match[1];
  
  // Replace the export statement
  const newContent = content.replace(
    /module\.exports\s*=\s*([A-Z][a-zA-Z0-9]*);/,
    `// Export an instance of the class rather than the class definition\nmodule.exports = new $1();`
  );
  
  // Write the updated content back to the file
  fs.writeFileSync(filePath, newContent);
  return true;
};

// Main function
const main = () => {
  console.log('🚀 Standardizing Vancouver scrapers exports...');
  
  const potentialScrapers = getPotentialScrapers();
  console.log(`Found ${potentialScrapers.length} potential scraper files`);
  
  const results = {
    checked: 0,
    fixed: 0,
    alreadyStandardized: 0,
    couldNotFix: 0,
    details: []
  };
  
  for (const file of potentialScrapers) {
    const filePath = path.join(SCRAPERS_DIR, file);
    results.checked++;
    
    try {
      // Check the current export format
      const { exportsClass, exportsInstance } = checkExportFormat(filePath);
      
      if (exportsClass) {
        // This file exports a class and needs to be fixed
        console.log(`🔧 Fixing export format for ${file}...`);
        const fixed = fixExportFormat(filePath);
        
        if (fixed) {
          console.log(`✅ Successfully fixed ${file}`);
          results.fixed++;
          results.details.push({
            file,
            action: 'fixed',
            status: 'success'
          });
        } else {
          console.log(`❌ Could not fix ${file}`);
          results.couldNotFix++;
          results.details.push({
            file,
            action: 'attempted_fix',
            status: 'failed'
          });
        }
      } else if (exportsInstance) {
        // This file already exports an instance
        console.log(`✅ ${file} already exports an instance`);
        results.alreadyStandardized++;
        results.details.push({
          file,
          action: 'none',
          status: 'already_standardized'
        });
      } else {
        // This file has an unknown export format
        console.log(`⚠️ Unknown export format in ${file}`);
        results.couldNotFix++;
        results.details.push({
          file,
          action: 'none',
          status: 'unknown_format'
        });
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`);
      results.couldNotFix++;
      results.details.push({
        file,
        action: 'none',
        status: 'error',
        message: error.message
      });
    }
  }
  
  // Save results to file
  const resultsPath = path.join(SCRAPERS_DIR, 'standardize_exports_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n📊 Export Standardization Summary:');
  console.log(`Total files checked: ${results.checked}`);
  console.log(`Files fixed: ${results.fixed}`);
  console.log(`Files already standardized: ${results.alreadyStandardized}`);
  console.log(`Files that could not be fixed: ${results.couldNotFix}`);
  console.log(`\nDetailed results saved to ${resultsPath}`);
};

// Run the main function
main();
