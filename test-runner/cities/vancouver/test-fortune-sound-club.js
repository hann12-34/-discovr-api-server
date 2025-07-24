/**
 * Test Fortune Sound Club Scraper
 * 
 * This script tests the Fortune Sound Club scraper that uses do604.com as the source
 */

const FortuneSoundClubScraper = require('./fortuneSoundClubScraper');
const path = require('path');
const fs = require('fs');

// Create debug directory if it doesn't exist
const debugDir = path.join(__dirname, 'debug');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

// Run the scraper
async function runScraper() {
  console.log('🎵 Testing Fortune Sound Club scraper (do604.com source)...\n');
  
  try {
    // Initialize the scraper with debug options
    const fortuneScraper = new FortuneSoundClubScraper({
      debug: true,
      saveHtml: true,
      saveScreenshots: true,
      debugDir,
      logEvents: true
    });
    
    console.log('Running Fortune Sound Club scraper...');
    const events = await fortuneScraper.scrape();
    console.log(`✅ Found ${events.length} events\n`);
    
    // Display all events with details
    if (events.length > 0) {
      console.log('Events found:\n');
      // Display all events with their details
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        console.log(`-------- Event ${i + 1} of ${events.length} --------`);
        console.log(`ID: ${event.id}`);
        console.log(`Title: ${event.title}`);
        
        // Format date information nicely
        if (event.date) console.log(`Date String: ${event.date}`);
        if (event.startDate) {
          const formattedDate = event.startDate.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
          });
          console.log(`Start Date: ${formattedDate}`);
        } else {
          console.log('Start Date: ⚠️ Using fallback date');
        }
        
        // Show description with ellipsis if too long
        if (event.description) {
          const truncatedDesc = event.description.length > 150 ? 
            `${event.description.substring(0, 150)}...` : 
            event.description;
          console.log(`Description: ${truncatedDesc}`);
        }
        
        // Show URLs
        console.log(`Source URL: ${event.sourceURL}`);
        if (event.ticketURL && event.ticketURL !== event.sourceURL) {
          console.log(`Ticket URL: ${event.ticketURL}`);
        }
        
        // Show image if available
        if (event.image) console.log(`Image: ${event.image}`);
        
        console.log(); // Add a blank line between events for readability
      }
    } else {
      console.log('No events found.');
    }
    
    // Print summary
    console.log('\n--- Summary ---');
    console.log(`Fortune Sound Club Scraper (do604.com): ${events.length} events found`);
    
    // Check for events with missing dates
    const eventsWithFallbackDates = events.filter(event => !event.startDate);
    if (eventsWithFallbackDates.length > 0) {
      console.log(`⚠️ Warning: ${eventsWithFallbackDates.length} events are using fallback dates`);
    }
    
    // Count events with images
    const eventsWithImages = events.filter(event => event.image);
    console.log(`📸 Events with images: ${eventsWithImages.length} of ${events.length}`);
    
    // Count events with ticket URLs
    const eventsWithTickets = events.filter(event => event.ticketURL && event.ticketURL !== event.sourceURL);
    console.log(`🎟️ Events with ticket links: ${eventsWithTickets.length} of ${events.length}`);
    
    console.log('\nScraper test completed!');
  } catch (error) {
    console.error(`❌ Error running Fortune Sound Club scraper:`, error);
  }
}

// Run the scraper
runScraper().catch(error => {
  console.error('Error running Fortune Sound Club scraper:', error);
});;
