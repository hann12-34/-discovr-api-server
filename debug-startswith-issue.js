/**
 * DEBUG: Direct startsWith Issue Investigation
 * 
 * Pinpoints the exact line causing startsWith errors in Toronto scrapers
 * by adding debugging and error handling to identify the problematic code
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function debugStartsWithIssue() {
  console.log('🔬 DEBUGGING: Direct startsWith Investigation');
  console.log('='.repeat(50));
  
  // Focus on one failing scraper for detailed debugging
  const testScraper = 'scrape-ago-events-clean.js';
  const scraperPath = path.join(TORONTO_DIR, testScraper);
  
  try {
    console.log(`\n🔍 Inspecting ${testScraper} for ALL startsWith calls:`);
    
    const content = fs.readFileSync(scraperPath, 'utf8');
    const lines = content.split('\n');
    
    // Find ALL lines containing startsWith
    const startsWithLines = [];
    lines.forEach((line, index) => {
      if (line.includes('.startsWith')) {
        startsWithLines.push({
          lineNum: index + 1,
          content: line.trim()
        });
      }
    });
    
    console.log(`📋 Found ${startsWithLines.length} startsWith calls:`);
    startsWithLines.forEach(item => {
      console.log(`   Line ${item.lineNum}: ${item.content}`);
    });
    
    // Try to load and call the scraper with detailed error catching
    console.log(`\n🧪 Testing ${testScraper} with enhanced error handling:`);
    
    delete require.cache[require.resolve(scraperPath)];
    const scraper = require(scraperPath);
    
    if (typeof scraper.scrapeEvents === 'function') {
      console.log('✅ Function loaded successfully');
      
      try {
        // Wrap the call in a try-catch to get the exact error location
        console.log('🎯 Calling scrapeEvents("Toronto")...');
        const result = await scraper.scrapeEvents('Toronto');
        console.log(`✅ Success! Found ${result?.length || 0} events`);
        
        if (result && result.length > 0) {
          const firstEvent = result[0];
          console.log(`📍 Sample event: ${firstEvent.title || 'No title'}`);
          console.log(`🔗 Event URL: ${firstEvent.eventUrl || 'No URL'}`);
          console.log(`🏢 Venue: ${firstEvent.venue || 'No venue'}`);
        }
        
      } catch (error) {
        console.log(`❌ ERROR DETAILS:`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Stack trace:`);
        
        const stackLines = error.stack.split('\n');
        stackLines.forEach((line, index) => {
          if (index < 10) { // Show first 10 lines of stack
            console.log(`     ${line}`);
          }
        });
        
        // Try to identify which startsWith call is failing
        if (error.message.includes('startsWith')) {
          console.log(`\n🚨 STARTSWITH ERROR IDENTIFIED:`);
          console.log(`   This confirms the startsWith error location.`);
          console.log(`   Need to check variables before calling startsWith.`);
        }
      }
      
    } else {
      console.log('❌ scrapeEvents function not found');
    }
    
  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
  }
}

// Run the debug
debugStartsWithIssue().catch(console.error);
