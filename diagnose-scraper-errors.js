/**
 * DIAGNOSIS: Scraper Runtime Errors
 * 
 * Diagnoses why scrapers are failing with utility/import errors
 * Focus: "Cannot read properties of undefined (reading 'startsWith')" 
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function diagnoseScraper(scraperFile) {
  console.log(`\n🔍 DIAGNOSING: ${scraperFile}`);
  console.log('='.repeat(40));
  
  const scraperPath = path.join(TORONTO_DIR, scraperFile);
  
  try {
    // Read the file content to check for obvious issues
    const content = fs.readFileSync(scraperPath, 'utf8');
    
    // Check imports
    const importLines = content.split('\n').filter(line => 
      line.includes('require(') || line.includes('import ')
    );
    
    console.log('📦 IMPORTS FOUND:');
    importLines.forEach(line => console.log(`   ${line.trim()}`));
    
    // Check for potential undefined variables in startsWith calls
    const startWithLines = content.split('\n').filter((line, index) => 
      line.includes('.startsWith(')
    ).map((line, index, arr) => {
      const lineNum = content.split('\n').indexOf(line) + 1;
      return `Line ${lineNum}: ${line.trim()}`;
    });
    
    if (startWithLines.length > 0) {
      console.log('\n🔍 STARTSWITH CALLS:');
      startWithLines.forEach(line => console.log(`   ${line}`));
    }
    
    // Try to actually import the scraper
    console.log('\n🧪 ATTEMPTING IMPORT:');
    delete require.cache[require.resolve(scraperPath)];
    
    try {
      const scraper = require(scraperPath);
      console.log(`✅ Import successful`);
      console.log(`📋 Exports: ${Object.keys(scraper).join(', ')}`);
      
      if (typeof scraper.scrapeEvents === 'function') {
        console.log('✅ scrapeEvents function found');
        
        // Try calling with Toronto parameter
        console.log('\n🎯 TESTING FUNCTION CALL:');
        try {
          // Set a timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Function call timeout')), 5000)
          );
          
          const callPromise = scraper.scrapeEvents('Toronto');
          const result = await Promise.race([callPromise, timeoutPromise]);
          
          console.log(`✅ Function call successful - found ${result?.length || 0} events`);
          
        } catch (funcError) {
          console.log(`❌ Function call failed: ${funcError.message}`);
          
          // Check if it's the specific startsWith error
          if (funcError.message.includes('startsWith')) {
            console.log('🚨 STARTSWITH ERROR DETECTED - investigating...');
            
            // Look for variables that might be undefined
            const errorStack = funcError.stack || '';
            console.log('📄 Error context:', errorStack.split('\n')[0]);
          }
        }
      } else {
        console.log('❌ scrapeEvents function not found');
      }
      
    } catch (importError) {
      console.log(`❌ Import failed: ${importError.message}`);
    }
    
  } catch (readError) {
    console.log(`❌ File read failed: ${readError.message}`);
  }
}

async function runDiagnosis() {
  console.log('🩺 SCRAPER ERROR DIAGNOSIS');
  console.log('='.repeat(50));
  
  // Test the specific scrapers that were failing
  const failingScrapers = [
    'scrape-ago-events-clean.js',
    'scrape-moca-events.js'
  ];
  
  for (const scraper of failingScrapers) {
    await diagnoseScraper(scraper);
  }
  
  console.log('\n📊 DIAGNOSIS COMPLETE');
  console.log('Check above for specific error patterns and root causes.');
}

// Run diagnosis
runDiagnosis().catch(console.error);
