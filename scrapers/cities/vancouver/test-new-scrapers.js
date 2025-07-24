/**
 * Test script to validate all newly created scrapers
 * Ensures they are properly registered and have the correct interface
 */
const scraperSystem = require('./scrapers');

// Function to validate scraper interface
function validateScraper(scraper) {
  const issues = [];
  
  // Check required properties
  if (!scraper.name) {
    issues.push(`Missing 'name' property`);
  }
  
  if (!scraper.scrape || typeof scraper.scrape !== 'function') {
    issues.push(`Missing 'scrape()' function`);
  }
  
  if (!scraper.urls || !Array.isArray(scraper.urls) || scraper.urls.length === 0) {
    issues.push(`Missing or invalid 'urls' array property`);
  }
  
  return {
    name: scraper.name || 'Unnamed Scraper',
    isValid: issues.length === 0,
    issues
  };
}

// List of new scrapers we want to test
const newVenueScraperNames = [
  'Hollywood Theatre',
  'Imperial Vancouver',
  'Chan Centre',
  'Vancouver Symphony',
  'Cecil Green Park Arts House',
  'Centre for Eating Disorders',
  'Biltmore Cabaret',
  'Jazzy Vancouver',
  'St Pauls Anglican'
];

const newEventScraperNames = [
  'Vancouver Comedy Festival',
  'BC Event Calendar',
  'Coastal Jazz Festival',
  'Destination Vancouver Events',
  'VanDusen Garden Events',
  'Vancouver Christmas Market',
  'Vancouver Farmers Markets',
  'Capilano Bridge',
  'Grouse Mountain Events',
  'Dragon Boat BC',
  'Beer Festival',
  'I Heart Raves Events'
];

// Run tests
async function runTests() {
  console.log('Testing newly added scrapers...\n');
  
  // Get all registered scrapers
  const allScrapers = scraperSystem.scrapers;
  console.log(`Total registered scrapers: ${allScrapers.length}`);
  
  // Test new venue scrapers
  console.log('\n===== TESTING NEW VENUE SCRAPERS =====');
  testScraperGroup(allScrapers, newVenueScraperNames);
  
  // Test new event scrapers
  console.log('\n===== TESTING NEW EVENT SCRAPERS =====');
  testScraperGroup(allScrapers, newEventScraperNames);
  
  // Test running one of the new scrapers (non-blocking)
  console.log('\n===== TESTING A SAMPLE SCRAPER EXECUTION =====');
  try {
    console.log('Testing Destination Vancouver Events scraper - expecting empty array (scaffold)');
    const events = await scraperSystem.runScraper('Destination Vancouver Events');
    console.log(`Scraper returned ${events.length} events (expected 0 for scaffold)`);
  } catch (error) {
    console.error('Error testing scraper execution:', error);
  }
}

function testScraperGroup(allScrapers, scraperNames) {
  const results = {
    found: 0,
    missing: 0,
    invalid: 0,
    valid: 0
  };
  
  const missingScrapers = [];
  const invalidScrapers = [];
  
  scraperNames.forEach(name => {
    const scraper = allScrapers.find(s => s.name === name);
    
    if (!scraper) {
      console.log(`❌ Scraper not found: ${name}`);
      missingScrapers.push(name);
      results.missing++;
      return;
    }
    
    results.found++;
    const validation = validateScraper(scraper);
    
    if (validation.isValid) {
      console.log(`✅ Scraper valid: ${name}`);
      results.valid++;
    } else {
      console.log(`❌ Scraper invalid: ${name}`);
      console.log(`   Issues: ${validation.issues.join(', ')}`);
      invalidScrapers.push({ name, issues: validation.issues });
      results.invalid++;
    }
  });
  
  // Summary
  console.log('\nSummary:');
  console.log(`Total scrapers checked: ${scraperNames.length}`);
  console.log(`Found: ${results.found}`);
  console.log(`Missing: ${results.missing}`);
  console.log(`Valid: ${results.valid}`);
  console.log(`Invalid: ${results.invalid}`);
  
  if (missingScrapers.length > 0) {
    console.log('\nMissing scrapers:');
    missingScrapers.forEach(name => console.log(`- ${name}`));
  }
  
  if (invalidScrapers.length > 0) {
    console.log('\nInvalid scrapers:');
    invalidScrapers.forEach(scraper => {
      console.log(`- ${scraper.name}: ${scraper.issues.join(', ')}`);
    });
  }
}

// Execute tests
runTests();
