/**
 * Find scrapers generating "Untitled Event" entries
 * This script analyzes each scraper to identify which ones are producing events with missing titles
 */

const path = require('path');
const fs = require('fs');

// Import the VancouverScrapers class
const VancouverScrapers = require('./scrapers/cities/vancouver/index');

// Create an instance of VancouverScrapers
const vancouverScrapers = new VancouverScrapers();

// Function to run a scraper and check for untitled events
async function checkScraperForUntitledEvents(scraper, scraperName) {
  try {
    console.log(`\n🔍 Checking ${scraperName}...`);
    const events = await scraper.scrape();
    
    if (!events || events.length === 0) {
      console.log(`  ℹ️ No events found for ${scraperName}`);
      return { scraperName, untitledCount: 0, totalEvents: 0, untitledEvents: [] };
    }
    
    // Filter for untitled events
    const untitledEvents = events.filter(event => {
      return !event.title || 
        event.title === 'Untitled Event' || 
        event.title === '' || 
        event.title === 'undefined' ||
        event.title.trim() === '';
    });
    
    // Display results
    if (untitledEvents.length > 0) {
      console.log(`  ⚠️ FOUND ${untitledEvents.length} of ${events.length} untitled events in ${scraperName}`);
      
      // Display sample of untitled events
      const sample = untitledEvents.slice(0, 3);
      sample.forEach((event, i) => {
        console.log(`  Event ${i + 1}:`);
        console.log(`    Venue: ${event.venue || 'Unknown'}`);
        console.log(`    Date: ${event.date ? new Date(event.date).toLocaleDateString() : 'Unknown'}`);
        console.log(`    Price: ${event.price || 'Unknown'}`);
        console.log(`    Title: "${event.title || 'null/undefined'}"`);
        console.log(`    URL: ${event.url || 'Unknown'}`);
      });
      
      if (untitledEvents.length > 3) {
        console.log(`    ... and ${untitledEvents.length - 3} more`);
      }
    } else {
      console.log(`  ✅ All events have titles in ${scraperName}`);
    }
    
    return {
      scraperName,
      untitledCount: untitledEvents.length,
      totalEvents: events.length,
      untitledEvents: untitledEvents
    };
  } catch (error) {
    console.error(`  ❌ Error checking ${scraperName}: ${error.message}`);
    return { scraperName, error: error.message, untitledCount: 0, totalEvents: 0 };
  }
}

// Main function to run the analysis
async function analyzeScrapers() {
  console.log('=========================================');
  console.log('🔍 ANALYZING SCRAPERS FOR UNTITLED EVENTS');
  console.log('=========================================');
  
  const results = [];
  
  // Process each scraper
  for (const scraper of vancouverScrapers.scrapers) {
    if (!scraper || typeof scraper.scrape !== 'function' || !scraper.name) {
      continue;
    }
    
    const result = await checkScraperForUntitledEvents(scraper, scraper.name);
    results.push(result);
  }
  
  // Sort results by number of untitled events
  results.sort((a, b) => b.untitledCount - a.untitledCount);
  
  // Display summary
  console.log('\n=========================================');
  console.log('📊 SUMMARY OF UNTITLED EVENTS');
  console.log('=========================================');
  
  const problemScrapers = results.filter(r => r.untitledCount > 0);
  
  console.log(`Found ${problemScrapers.length} scrapers producing untitled events:`);
  problemScrapers.forEach(result => {
    const percentage = result.totalEvents > 0 ? 
      ((result.untitledCount / result.totalEvents) * 100).toFixed(1) : 0;
    console.log(`- ${result.scraperName}: ${result.untitledCount}/${result.totalEvents} events untitled (${percentage}%)`);
  });
  
  // Generate a report file
  const report = {
    timestamp: new Date().toISOString(),
    totalScrapers: vancouverScrapers.scrapers.length,
    scrapersWithUntitledEvents: problemScrapers.length,
    problemScrapers: problemScrapers.map(p => ({
      name: p.scraperName,
      untitledCount: p.untitledCount,
      totalEvents: p.totalEvents,
      percentage: p.totalEvents > 0 ? ((p.untitledCount / p.totalEvents) * 100).toFixed(1) : 0,
      sampleEvents: p.untitledEvents.slice(0, 3).map(e => ({
        venue: e.venue || 'Unknown',
        date: e.date ? new Date(e.date).toLocaleDateString() : 'Unknown',
        price: e.price || 'Unknown'
      }))
    }))
  };
  
  fs.writeFileSync(
    'untitled-events-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\nDetailed report saved to untitled-events-report.json');
}

analyzeScrapers().catch(err => {
  console.error('Error in analysis:', err);
});
