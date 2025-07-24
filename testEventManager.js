// Test script for Vancouver Event Manager

const VancouverEventManager = require('./restored-scrapers/cities/vancouver/vancouverEventManager');
const fs = require('fs');

async function runTest() {
  console.log('Starting Vancouver Event Manager test...');
  
  const manager = new VancouverEventManager();
  
  // Run just the two scrapers we know are working well
  const rickshawEvents = await manager.scrapeByName('Rickshaw Theatre Events');
  const foxEvents = await manager.scrapeByName('Fox Cabaret Events');
  
  // Combine results
  const combinedEvents = [...rickshawEvents, ...foxEvents];
  
  // Save results to file
  fs.writeFileSync('vancouver-events.json', JSON.stringify(combinedEvents, null, 2));
  
  console.log(`Saved ${combinedEvents.length} events to vancouver-events.json`);
}

runTest().catch(console.error);
