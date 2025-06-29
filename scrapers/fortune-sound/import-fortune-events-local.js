const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration for local testing
const API_BASE_URL = 'http://localhost:3030/api/v1';
const IMPORT_BATCH_ENDPOINT = '/import/batch';
const FORTUNE_JSON_PATH = path.join(__dirname, 'Scrapers/FortuneSound/fortune_events.json');
const IMPORT_BATCH_SIZE = 10; // Number of events to send in each batch

// Function to read Fortune events JSON
async function readFortuneEvents() {
  try {
    console.log(`Reading Fortune events from: ${FORTUNE_JSON_PATH}`);
    const eventsData = fs.readFileSync(FORTUNE_JSON_PATH, 'utf8');
    return JSON.parse(eventsData);
  } catch (error) {
    console.error('Error reading Fortune events:', error);
    throw error;
  }
}

// Function to import events via local API
async function importEventsViaLocalApi(events) {
  // Configure axios with needed headers
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
  });

  console.log(`Importing ${events.length} events to local API at ${API_BASE_URL}${IMPORT_BATCH_ENDPOINT}`);
  
  // Split events into batches
  const batches = [];
  for (let i = 0; i < events.length; i += IMPORT_BATCH_SIZE) {
    batches.push(events.slice(i, i + IMPORT_BATCH_SIZE));
  }
  
  console.log(`Split into ${batches.length} batches of up to ${IMPORT_BATCH_SIZE} events each`);
  
  // Process each batch
  let successCount = 0;
  let errorCount = 0;
  
  for (let [index, batch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length} (${batch.length} events)`);
    
    try {
      // Send the batch as a POST request
      const response = await axios.post(`${API_BASE_URL}${IMPORT_BATCH_ENDPOINT}`, batch, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Batch ${index + 1} imported successfully`);
        const resultData = response.data;
        console.log(`   Imported: ${resultData.imported || 0}, Updated: ${resultData.updated || 0}`);
        successCount += batch.length;
      } else {
        console.error(`❌ Batch ${index + 1} failed with status ${response.status}`);
        console.error(response.data);
        errorCount += batch.length;
      }
    } catch (error) {
      console.error(`❌ Error importing batch ${index + 1}:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Response data:', error.response.data);
      }
      errorCount += batch.length;
    }
    
    // Small delay between batches to avoid overloading the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\nImport Summary:');
  console.log(`✅ ${successCount} events imported successfully`);
  console.log(`❌ ${errorCount} events failed to import`);
  
  return { successCount, errorCount };
}

// Main function
async function main() {
  try {
    // Read Fortune events
    const events = await readFortuneEvents();
    console.log(`Found ${events.length} Fortune Sound Club events`);
    
    // Sample first event for verification
    console.log('\nSample event:');
    console.log(JSON.stringify(events[0], null, 2));
    
    // Confirm before importing
    console.log('\n⚠️ Ready to import events to local API. Press Ctrl+C to cancel or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Import events
    await importEventsViaLocalApi(events);
  } catch (error) {
    console.error('Error importing events:', error);
  }
}

// Execute main function
main();
