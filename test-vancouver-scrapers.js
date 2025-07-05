/**
 * Test script for newly created Vancouver scrapers
 * Tests the five new scrapers we've developed:
 * 1. The Vegan Market
 * 2. Queer Arts Festival
 * 3. Bard on the Beach Special Events
 * 4. Festival d'Été at Le Centre Culturel Francophone de Vancouver
 * 5. Broadway Vancouver
 */

// Import scrapers directly
const veganMarketEvents = require('./scrapers/cities/vancouver/veganMarketEvents');
const queerArtsFestivalEvents = require('./scrapers/cities/vancouver/queerArtsFestivalEvents');
const bardOnTheBeachEvents = require('./scrapers/cities/vancouver/bardOnTheBeachEvents');
const festivalDEteEvents = require('./scrapers/cities/vancouver/festivalDEteEvents');
const broadwayVancouverEvents = require('./scrapers/cities/vancouver/broadwayVancouverEvents');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// List of scrapers to test
const scrapers = [
  { name: 'The Vegan Market', scraper: veganMarketEvents },
  { name: 'Queer Arts Festival', scraper: queerArtsFestivalEvents },
  { name: 'Bard on the Beach Special Events', scraper: bardOnTheBeachEvents },
  { name: 'Festival d\'Été', scraper: festivalDEteEvents },
  { name: 'Broadway Vancouver', scraper: broadwayVancouverEvents }
];

// Function to validate event data
function validateEvent(event) {
  const issues = [];
  
  // Check required fields
  if (!event.id) issues.push('Missing ID');
  if (!event.title) issues.push('Missing title');
  if (!event.startDate || !(event.startDate instanceof Date)) issues.push('Invalid startDate');
  if (!event.venue || !event.venue.name) issues.push('Missing venue info');
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Run tests sequentially
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}=========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  TESTING NEW VANCOUVER EVENT SCRAPERS${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}=========================================${colors.reset}\n`);
  
  for (const { name, scraper } of scrapers) {
    console.log(`${colors.bright}${colors.blue}Testing ${name} scraper...${colors.reset}`);
    
    try {
      const startTime = Date.now();
      console.log(`- Starting scraper execution at ${new Date().toLocaleTimeString()}`);
      
      // Run the scraper with a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after 60 seconds for ${name} scraper`)), 60000);
      });
      
      const events = await Promise.race([
        scraper.scrape(),
        timeoutPromise
      ]);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (!events || events.length === 0) {
        console.log(`${colors.yellow}⚠️ No events returned from ${name} scraper (${duration.toFixed(2)}s)${colors.reset}`);
        continue;
      }
      
      console.log(`${colors.green}✅ ${events.length} events found from ${name} scraper (${duration.toFixed(2)}s)${colors.reset}`);
      
      // Validate first event
      const firstEvent = events[0];
      console.log(`\nSample event from ${name}:`);
      console.log(`- ID: ${colors.dim}${firstEvent.id}${colors.reset}`);
      console.log(`- Title: ${colors.bright}${firstEvent.title}${colors.reset}`);
      console.log(`- Date: ${firstEvent.startDate?.toLocaleString() || 'Unknown'}`);
      console.log(`- Venue: ${firstEvent.venue?.name || 'Unknown'}`);
      console.log(`- Image: ${firstEvent.image ? '✓' : '✗'}`);
      console.log(`- Description: ${firstEvent.description ? (firstEvent.description.substring(0, 50) + '...') : 'None'}`);
      
      // Validate all events
      const validationResults = events.map(validateEvent);
      const validEvents = validationResults.filter(r => r.isValid).length;
      const invalidEvents = validationResults.filter(r => !r.isValid).length;
      
      if (invalidEvents > 0) {
        console.log(`${colors.yellow}⚠️ ${invalidEvents} invalid events found${colors.reset}`);
        
        // Show first few invalid events
        const firstInvalidIndex = validationResults.findIndex(r => !r.isValid);
        if (firstInvalidIndex !== -1) {
          const invalidEvent = events[firstInvalidIndex];
          const issues = validationResults[firstInvalidIndex].issues;
          console.log(`\nIssues with event #${firstInvalidIndex + 1}:`);
          console.log(`- Title: ${invalidEvent.title || 'Unknown'}`);
          console.log(`- Issues: ${colors.red}${issues.join(', ')}${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}✅ All ${validEvents} events are valid${colors.reset}`);
      }
      
    } catch (error) {
      console.error(`${colors.red}❌ Error in ${name} scraper: ${error.message}${colors.reset}`);
      console.error(error);
    }
    
    console.log('\n-----------------------------------\n');
  }
  
  console.log(`${colors.bright}${colors.green}All scraper tests completed.${colors.reset}`);
  console.log(`${colors.dim}Next steps: Run import-all-scrapers.js to import these events to MongoDB${colors.reset}`);
}

// Execute tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error in test script: ${error.message}${colors.reset}`);
  console.error(error);
});
