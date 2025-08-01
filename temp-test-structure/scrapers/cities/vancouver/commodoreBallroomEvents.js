/**
 * Commodore Ballroom Events Scraper
 * Scrapes upcoming events from the Commodore Ballroom in Vancouver using Ticketmaster API.
 */

const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');

const CommodoreBallroomEvents = {
  async scrape() {
    console.log('🔍 Scraping events from The Commodore Ballroom via Ticketmaster API...');
    
    try {
      // Use the Ticketmaster API to fetch events for Commodore Ballroom in Vancouver
      const response = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: {
          keyword: 'Commodore Ballroom', // Search for events with Commodore Ballroom in the name
          city: 'Vancouver',            // Limit to Vancouver
          stateCode: 'BC',             // British Columbia
          countryCode: 'CA',           // Canada
          apikey: 'DW0E98NrxUIfDDtNN7ijruVSm60ryFLX', // Public Ticketmaster API key
          size: 100, // Get up to 100 events
          sort: 'date,asc' // Sort by date ascending
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        }
      });
      
      // Save the API response for debugging
      fs.writeFileSync('commodore-ticketmaster-response.json', JSON.stringify(response.data, null, 2));
      console.log('Saved API response to commodore-ticketmaster-response.json');
      
      if (!response.data?._embedded?.events) {
        console.log('API endpoint did not return expected data structure');
        return [];
      }
      
      const events = response.data._embedded.events;
      console.log(`Found ${events.length} events from Ticketmaster API`);
      
      // Process each event
      const processedEvents = [];
      
      for (const event of events) {
        try {
          const name = event.name;
          // Try to get the date from various possible locations in the API response
          const dateText = event.dates?.start?.dateTime || 
                          event.dates?.start?.localDate || 
                          null;
          
          if (!name || !dateText) {
            console.log(`Skipping event "${name || 'unnamed'}" - missing date information`);
            continue;
          }
          
          console.log(`Processing event: "${name}", Date text: "${dateText}"`);
          
          // Parse the date
          const dateObj = new Date(dateText);
          
          if (isNaN(dateObj.getTime())) {
            console.error(`Failed to parse date: ${dateText}`);
            continue;
          }
          
          // Get the image URL if available
          let imageUrl = '';
          if (event.images && event.images.length > 0) {
            // Find the best image (usually the one with ratio 16_9 or largest width)
            const bestImage = event.images.find(img => img.ratio === '16_9') || 
                            event.images.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
            imageUrl = bestImage.url;
          }
          
          // Get the event URL
          const url = event.url || `https://www.ticketmaster.ca/event/${event.id}`;
          
          // Create the processed event object
          const processedEvent = {
            title: name,
            startDate: dateObj.toISOString(),
            endDate: dateObj.toISOString(), // Same day event
            url: url,
            imageUrl: imageUrl,
            venue: 'Commodore Ballroom',
            organizer: 'Live Nation',
            address: '868 Granville St, Vancouver, BC V6Z 1K3',
            slug: slugify(name, { lower: true, strict: true }),
            city: 'vancouver',
            source: 'commodore-ballroom'
          };
          
          processedEvents.push(processedEvent);
        } catch (e) {
          console.error(`Error processing event:`, e);
        }
      }
      
      console.log(`Successfully processed ${processedEvents.length} events from Commodore Ballroom`);
      return processedEvents;
      
    } catch (error) {
      console.error('Error scraping Commodore Ballroom events:', error);
      return [];
    }
  }
};

module.exports = CommodoreBallroomEvents;
