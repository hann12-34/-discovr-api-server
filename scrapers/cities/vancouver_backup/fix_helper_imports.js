const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Fix Helper Import Script
 * 
 * This script analyzes all JavaScript files in the directory and:
 * 1. Identifies scrapers with broken imports to './utils/helpers'
 * 2. Fixes these imports to use the local helpers module we've added
 */

const fs = require('fs');
const path = require('path');

const DIRECTORY = __dirname;
const LOG_FILE = 'import_fixes_log.json';

// Main function
async function main() {
  console.log('🔍 Starting helper import fixes...');
  
  // Get all JavaScript files in the directory
  const files = fs.readdirSync(DIRECTORY).filter(file => 
    file.endsWith('.js') && 
    !file.startsWith('test_') && 
    !file.startsWith('run_') && 
    !file.includes('check_') &&
    !file.includes('list_') &&
    !file.includes('fix_')
  );
  
  const results = {
    timestamp: new Date().toISOString(),
    directory: DIRECTORY,
    summary: {
      total: 0,
      fixed: 0,
      skipped: 0,
      errors: 0
    },
    files: []
  };
  
  console.log(`Found ${files.length} JavaScript files to check`);
  
  // Process each file
  for (const file of files) {
    const filePath = path.join(DIRECTORY, file);
    
    try {
      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for helper import patterns
      const hasHelperImport = content.includes("require('./utils/helpers')") || 
                             content.includes("require(\"./utils/helpers\")") ||
                             content.includes("require('../utils/helpers')") ||
                             content.includes("require(\"../utils/helpers\")");
      
      // Check if the file actually uses helpers
      const usesHelpers = content.includes('helpers.normalizeEvent') || 
                         content.includes('helpers.generateDeterministicId') || 
                         content.includes('helpers.parseDate');
      
      // Skip files that don't use helpers
      if (!usesHelpers) {
        console.log(`⏩ Skipping ${file}: Does not use helper functions`);
        results.summary.skipped++;
        results.files.push({
          file,
          status: 'skipped',
          reason: 'Does not use helper functions'
        });
        continue;
      }
      
      // Skip files that already have the correct import
      if (hasHelperImport && content.includes("require('./utils/helpers')")) {
        console.log(`✓ ${file} already has correct import`);
        results.summary.skipped++;
        results.files.push({
          file,
          status: 'skipped',
          reason: 'Already has correct import'
        });
        continue;
      }
      
      // Fix the import
      let fixedContent = content;
      let importFixed = false;
      
      if (content.includes("require('../utils/helpers')")) {
        fixedContent = content.replace(
          "require('../utils/helpers')",
          "require('./utils/helpers')"
        );
        importFixed = true;
      } else if (content.includes("require(\"../utils/helpers\")")) {
        fixedContent = content.replace(
          "require(\"../utils/helpers\")",
          "require(\"./utils/helpers\")"
        );
        importFixed = true;
      } else if (!hasHelperImport && usesHelpers) {
        // Add the import if it's missing but the file uses helpers
        
        // Find the last require statement to insert after it
        const requireLines = content.split('\n').filter(line => line.includes('require('));
        
        if (requireLines.length > 0) {
          // Add after the last require
          const lastRequire = requireLines[requireLines.length - 1];
          fixedContent = content.replace(
            lastRequire,
            lastRequire + '\nconst helpers = require(\'./utils/helpers\');'
          );
        } else {
          // Add at the top of the file after any comment block
          const lines = content.split('\n');
          let insertIndex = 0;
          
          // Find the end of the initial comment block if any
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('*/')) {
              insertIndex = i + 1;
              break;
            }
            // If we find a non-comment, non-empty line, insert before it
            if (!lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*') && lines[i].trim() !== '') {
              insertIndex = i;
              break;
            }
          }
          
          // Insert the import
          lines.splice(insertIndex, 0, "const helpers = require('./utils/helpers');");
          fixedContent = lines.join('\n');
        }
        
        importFixed = true;
      }
      
      // Save the fixed content if changes were made
      if (importFixed) {
        fs.writeFileSync(filePath, fixedContent);
        console.log(`✅ Fixed helper import in ${file}`);
        results.summary.fixed++;
        results.files.push({
          file,
          status: 'fixed',
          changes: 'Updated helpers import path'
        });
      } else {
        console.log(`⏩ No fixes needed for ${file}`);
        results.summary.skipped++;
        results.files.push({
          file,
          status: 'skipped',
          reason: 'No fixes needed'
        });
      }
      
      results.summary.total++;
      
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`);
      results.summary.errors++;
      results.files.push({
        file,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Save results to file
  fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n📊 Import Fix Summary:');
  console.log(`Total files checked: ${results.summary.total}`);
  console.log(`Files fixed: ${results.summary.fixed}`);
  console.log(`Files skipped: ${results.summary.skipped}`);
  console.log(`Errors: ${results.summary.errors}`);
  console.log(`\nDetailed results saved to ${LOG_FILE}`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
