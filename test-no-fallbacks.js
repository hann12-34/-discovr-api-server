/**
 * Test script to verify scrapers are running properly without using fallbacks
 * 
 * This script specifically tests if scrapers are using their fallback logic
 * instead of properly scraping live data
 */

const japanMarketScraper = require('./scrapers/cities/vancouver/japanMarketEvents');
const vsffScraper = require('./scrapers/cities/vancouver/vsffEvents');
const runToEndEndoScraper = require('./scrapers/cities/vancouver/runToEndEndoEvents');
const chineseGardenScraper = require('./scrapers/cities/vancouver/chineseGardenEvents');
const musqueamScraper = require('./scrapers/cities/vancouver/musqueamEvents');

// Flag to enable debug mode
const DEBUG = true;

// Define a wrapper to add debug logging to the scraper
function withDebugLogging(scraper) {
  const originalScrape = scraper.scrape;
  
  // Create a wrapped version that adds debug logging
  scraper.scrape = async function() {
    console.log(`\n🔍 Testing ${scraper.name} for fallback usage...`);
    
    // Patch console.log to capture logs
    const originalLog = console.log;
    const logs = [];
    
    if (DEBUG) {
      console.log = function(...args) {
        logs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    }
    
    let events;
    try {
      events = await originalScrape.call(scraper);
      
      // Check logs for fallback indicators
      const fallbackIndicators = [
        'No events found',
        'Creating projected',
        'Using default',
        'fallback',
        'Fallback',
        'No structured events found',
        'Could not find',
        'unable to extract'
      ];
      
      const fallbackLogsFound = logs.filter(log => 
        fallbackIndicators.some(indicator => log.toLowerCase().includes(indicator.toLowerCase()))
      );
      
      if (fallbackLogsFound.length > 0) {
        console.log('⚠️ FALLBACK DETECTED: This scraper is using fallback logic!');
        console.log('⚠️ Fallback indicators found:');
        fallbackLogsFound.forEach(log => console.log(`  > ${log}`));
        return { 
          events: events, 
          usingFallback: true,
          fallbackReasons: fallbackLogsFound
        };
      } else {
        console.log('✅ NO FALLBACKS: This scraper is properly extracting live data');
        return { 
          events: events, 
          usingFallback: false
        };
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return { 
        events: [], 
        usingFallback: true,
        fallbackReasons: [`Error: ${error.message}`]
      };
    } finally {
      // Restore original console.log
      if (DEBUG) {
        console.log = originalLog;
      }
    }
  };
  
  return scraper;
}

/**
 * Main function to test all scrapers
 */
async function testAllScrapers() {
  console.log('🚀 Testing all scrapers for fallback usage');
  console.log('=========================================');
  
  const scrapers = [
    withDebugLogging(japanMarketScraper),
    withDebugLogging(vsffScraper),
    withDebugLogging(runToEndEndoScraper),
    withDebugLogging(chineseGardenScraper),
    withDebugLogging(musqueamScraper)
  ];
  
  const results = [];
  
  // Test each scraper
  for (const scraper of scrapers) {
    try {
      const result = await scraper.scrape();
      results.push({
        name: scraper.name,
        eventCount: result.events.length,
        usingFallback: result.usingFallback,
        fallbackReasons: result.fallbackReasons || []
      });
      
      console.log(`\n-----------------------------------------\n`);
    } catch (error) {
      console.error(`❌ Error testing ${scraper.name}: ${error.message}`);
      results.push({
        name: scraper.name,
        eventCount: 0,
        usingFallback: true,
        fallbackReasons: [`Error: ${error.message}`]
      });
    }
  }
  
  // Print summary
  console.log('\n📊 Fallback Usage Summary:');
  console.log('=========================================');
  
  let usingFallbackCount = 0;
  
  results.forEach(result => {
    if (result.usingFallback) {
      console.log(`❌ ${result.name}: Using fallbacks - ${result.eventCount} events`);
      usingFallbackCount++;
    } else {
      console.log(`✅ ${result.name}: No fallbacks - ${result.eventCount} events`);
    }
  });
  
  console.log('=========================================');
  console.log(`📈 Overall: ${results.length - usingFallbackCount}/${results.length} scrapers not using fallbacks`);
  
  // List all scrapers using fallbacks
  if (usingFallbackCount > 0) {
    console.log('\n⚠️ Scrapers using fallbacks:');
    results.filter(r => r.usingFallback).forEach(result => {
      console.log(`\n${result.name}:`);
      result.fallbackReasons.forEach(reason => console.log(`  - ${reason}`));
    });
  } else {
    console.log('\n🎉 All scrapers working properly without fallbacks!');
  }
}

// Run all tests
testAllScrapers().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
