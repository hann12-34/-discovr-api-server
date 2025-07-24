const destinationVancouverScraper = require('./scrapers/sources/destinationVancouverScraper');

async function testDestinationVancouverScraper() {
  console.log("Testing Destination Vancouver scraper...");
  
  try {
    // Run the scraper directly
    const events = await destinationVancouverScraper.scrape();
    
    console.log(`Total events found: ${events.length}`);
    
    // Count events by venue
    const venueCount = {};
    events.forEach(event => {
      const venueName = event.venue.name;
      venueCount[venueName] = (venueCount[venueName] || 0) + 1;
    });
    
    console.log("\nEvents by venue:");
    Object.entries(venueCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([venue, count]) => {
        console.log(`${venue}: ${count} events`);
      });
    
    // Display info about a sample of events
    if (events.length > 0) {
      console.log("\nSample events (one from each venue if possible):");
      
      // Get one sample event from each venue
      const uniqueVenues = [...new Set(events.map(event => event.venue.name))];
      const sampleEvents = uniqueVenues.map(venue => 
        events.find(event => event.venue.name === venue)
      );
      
      sampleEvents.forEach((event, i) => {
        if (i < 5) { // Limit to 5 venues for brevity
          console.log(`\nVenue: ${event.venue.name}`);
          console.log(`Event: ${event.title}`);
          console.log(`Date: ${event.startDate} to ${event.endDate || 'N/A'}`);
          console.log(`URL: ${event.sourceURL}`);
          console.log(`Address: ${event.venue.address}`);
          
          // Check if all required fields are present
          const missingFields = [];
          ['title', 'startDate', 'venue', 'sourceURL', 'imageURL', 'location', 'type', 'category', 'status', 'source']
            .forEach(field => {
              if (!event[field]) missingFields.push(field);
            });
          
          if (missingFields.length > 0) {
            console.log(`Missing fields: ${missingFields.join(', ')}`);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error testing scraper:", error);
  }
}

testDestinationVancouverScraper();
