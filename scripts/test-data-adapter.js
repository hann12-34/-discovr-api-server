/**
 * Test script for art gallery data adapter
 * 
 * This script demonstrates how the art gallery data adapter transforms
 * raw scraped data into the SeasonalActivity format used by the Discovr app.
 */

const { transformArtGalleryEvents } = require('../utils/artGalleryDataAdapter');
const vancouverArtGallery = require('../scrapers/venues/new/vancouverArtGallery');

async function main() {
  try {
    // 1. Get raw data from a scraper
    console.log('Scraping Vancouver Art Gallery data...');
    const rawEvents = await vancouverArtGallery.scrape();
    console.log(`Scraped ${rawEvents.length} raw events\n`);
    
    if (rawEvents.length === 0) {
      console.log('No events found. Exiting.');
      return;
    }
    
    // Show sample of raw data
    console.log('SAMPLE RAW EVENT:');
    console.log(JSON.stringify(rawEvents[0], null, 2));
    console.log('\n-----------------------------------\n');
    
    // 2. Transform data into app format
    console.log('Transforming events to app format...');
    const transformedEvents = transformArtGalleryEvents(rawEvents);
    console.log(`Transformed ${transformedEvents.length} events\n`);
    
    // Show sample of transformed data
    console.log('SAMPLE TRANSFORMED EVENT:');
    console.log(JSON.stringify(transformedEvents[0], null, 2));
    
    // 3. Show key data points that would appear in the app
    if (transformedEvents.length > 0) {
      const sample = transformedEvents[0];
      console.log('\n-----------------------------------\n');
      console.log('HOW THIS WOULD APPEAR IN THE APP:');
      console.log(`Name: ${sample.name}`);
      console.log(`Location: ${sample.location}`);
      console.log(`Type: ${sample.type}`);
      console.log(`Status: ${sample.currentStatus}`);
      console.log(`Season: ${sample.season}`);
      console.log(`Price: ${sample.price}`);
      console.log(`Start Date: ${sample.startDate ? sample.startDate.toLocaleDateString() : 'N/A'}`);
      console.log(`End Date: ${sample.endDate ? sample.endDate.toLocaleDateString() : 'N/A'}`);
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();
