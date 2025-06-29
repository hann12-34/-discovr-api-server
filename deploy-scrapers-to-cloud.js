// Script to run scrapers and send their events to the cloud API
const axios = require('axios');
const vancouverScrapers = require('./scrapers/cities/vancouver');

// Cloud API configuration
const API_BASE_URL = 'https://discovr-api-test-531591199325.northamerica-northeast2.run.app/api/v1';
const EVENTS_ENDPOINT = `${API_BASE_URL}/events`;

console.log('🔄 Running all venue scrapers and deploying to cloud API...');

async function runAllScrapersAndDeploy() {
  try {
    // Store results for reporting
    const results = {
      totalScrapers: 0,
      completedScrapers: 0,
      failedScrapers: 0,
      newEvents: 0,
      errors: []
    };

    // Run all Vancouver scrapers
    console.log('\n🏙️ Running Vancouver scrapers...');
    results.totalScrapers += vancouverScrapers.scrapers.length;

    for (const scraper of vancouverScrapers.scrapers) {
      try {
        console.log(`\n⚙️ Running ${scraper.name} scraper...`);
        const events = await scraper.scrape();
        console.log(`✅ Found ${events.length} events for ${scraper.name}`);

        if (events.length > 0) {
          console.log(`Uploading ${events.length} events from ${scraper.name} to cloud API...`);
          
          // Upload events in batches to avoid overwhelming the API
          const batchSize = 10;
          let successCount = 0;
          
          for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            
            try {
              // Check for existing events to avoid duplicates
              for (const event of batch) {
                // Format the event properly for the API
                const apiEvent = {
                  title: event.title,
                  description: event.description || '',
                  startDate: event.startDate,
                  endDate: event.endDate || event.startDate,
                  venue: {
                    name: event.venue?.name || scraper.name,
                    location: event.venue?.location || { address: '', city: 'Vancouver', province: 'BC', country: 'Canada' }
                  },
                  category: event.category || 'Music',
                  image: event.image || '',
                  sourceURL: event.sourceURL || '',
                  officialWebsite: event.officialWebsite || ''
                };
                
                try {
                  // First check if the event already exists by sourceURL
                  let existingEvent = null;
                  if (apiEvent.sourceURL) {
                    try {
                      const response = await axios.get(`${EVENTS_ENDPOINT}/url`, {
                        params: { url: apiEvent.sourceURL }
                      });
                      if (response.data && response.data.length > 0) {
                        existingEvent = response.data[0];
                      }
                    } catch (error) {
                      // Ignore errors when checking for existing events
                    }
                  }
                  
                  if (existingEvent) {
                    // Skip this event, it already exists
                    console.log(`Skipping existing event: ${apiEvent.title}`);
                  } else {
                    // Create new event in cloud API
                    await axios.post(EVENTS_ENDPOINT, apiEvent);
                    successCount++;
                    results.newEvents++;
                  }
                } catch (error) {
                  console.error(`Error uploading event "${apiEvent.title}":`, error.message);
                }
              }
            } catch (error) {
              console.error(`Error processing batch for ${scraper.name}:`, error.message);
            }
          }
          
          console.log(`✅ Successfully uploaded ${successCount} new events from ${scraper.name} to cloud API`);
        } else {
          console.log(`ℹ️ No events found for ${scraper.name}, skipping upload`);
        }

        results.completedScrapers++;
      } catch (error) {
        console.error(`❌ Error running ${scraper.name} scraper:`, error.message);
        results.failedScrapers++;
        results.errors.push({
          scraper: scraper.name,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n📊 SCRAPER DEPLOYMENT SUMMARY');
    console.log('============================');
    console.log(`Total scrapers: ${results.totalScrapers}`);
    console.log(`Completed successfully: ${results.completedScrapers}`);
    console.log(`Failed: ${results.failedScrapers}`);
    console.log(`New events uploaded to cloud: ${results.newEvents}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS');
      console.log('==========');
      results.errors.forEach((err, i) => {
        console.log(`${i+1}. ${err.scraper}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
runAllScrapersAndDeploy().catch(console.error);
