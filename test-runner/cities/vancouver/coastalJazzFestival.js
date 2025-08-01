/**
 * Coastal Jazz Festival Scraper
 * 
 * This scraper provides information about events at the Coastal Jazz Festival
 * Source: https://www.coastaljazz.ca/events/category/festival/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class CoastalJazzFestivalScraper {
  constructor() {
    this.name = 'Coastal Jazz Festival';
    this.url = 'https://www.coastaljazz.ca/events/category/festival/';
    this.sourceIdentifier = 'coastal-jazz-festival';
    
    // Main venue, but note that individual events may be at different venues
    this.venue = {
      name: 'Various Venues (Coastal Jazz Festival)',
      id: 'coastal-jazz-festival-vancouver',
      address: '295 E 11th Ave',  // Festival office address
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V5T 2C4',
      coordinates: {
        lat: 49.2607627,
        lng: -123.0984111
      },
      websiteUrl: 'https://www.coastaljazz.ca/',
      description: "The TD Vancouver International Jazz Festival is Vancouver's largest music festival, featuring over 100 concerts at various indoor and outdoor venues across the city. The festival presents international and local jazz, blues, and world music artists annually each June/July. It offers a mix of free and ticketed events, ranging from intimate club performances to large outdoor concerts."
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Coastal Jazz Festival scraper...');
    const events = [];
    
    try {
      // Fetch event data from the website
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);
      
      // Select all event containers
      $('.event-item, .tribe-events-list-event-container, article').each((i, element) => {
        try {
          // Extract event details (adjust selectors based on actual website structure)
          const title = $(element).find('.tribe-events-list-event-title, .event-title, h2').text().trim();
          const dateText = $(element).find('.tribe-event-date-start, .event-date, .date').text().trim();
          const venueText = $(element).find('.tribe-events-venue-details, .venue-details').text().trim();
          const eventUrl = $(element).find('a.tribe-event-url, a.read-more').attr('href');
          const imageUrl = $(element).find('img').attr('src');
          const description = $(element).find('.tribe-events-list-event-description, .event-description, .description').text().trim();
          
          // Skip if no title found
          if (!title) {
            return;
          }
          
          // Parse the date (adjust based on actual date format)
          let startDate, endDate;
          
          try {
            // Example date parsing assuming format like "June 21, 2025 @ 8:00 pm"
            const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})(?:\s+@\s+(\d+):(\d+)\s+(am|pm))?/i);
            if (dateMatch) {
              const month = dateMatch[1];
              const day = parseInt(dateMatch[2]);
              const year = parseInt(dateMatch[3]);
              const hour = dateMatch[4] ? parseInt(dateMatch[4]) : 19; // Default to 7pm if not specified
              const minute = dateMatch[5] ? parseInt(dateMatch[5]) : 30; // Default to 30 minutes if not specified
              const ampm = dateMatch[6] ? dateMatch[6].toLowerCase() : 'pm';
              
              const months = {
                'january': 0, 'february': 1, 'march': 2, 'april': 3,
                'may': 4, 'june': 5, 'july': 6, 'august': 7,
                'september': 8, 'october': 9, 'november': 10, 'december': 11
              };
              
              let hourIn24 = hour;
              if (ampm === 'pm' && hour < 12) hourIn24 += 12;
              if (ampm === 'am' && hour === 12) hourIn24 = 0;
              
              startDate = new Date(year, months[month.toLowerCase()], day, hourIn24, minute);
              
              endDate = new Date(startDate);
              // Typical jazz performance is 2 hours
              endDate.setHours(endDate.getHours() + 2);
            }
          } catch (dateError) {
            console.error(`⚠️ Error parsing date for event "${title}": ${dateError.message}`);
            // Use fallback date if parsing fails - set to next summer for Jazz Festival
            startDate = new Date();
            startDate.setMonth(5); // June
            startDate.setDate(startDate.getDate() + 30);
            startDate.setHours(19, 30, 0); // 7:30 PM
            
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2);
          }
          
          // Determine venue (if event-specific venue is provided, otherwise use default)
          let eventVenue = this.venue;
          if (venueText) {
            // Try to extract venue-specific info
            eventVenue = {
              ...this.venue,
              name: venueText.split(',')[0].trim(),
              id: `jazz-festival-venue-${venueText.split(',')[0].trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')}`
            };
          }
          
          // Create unique ID for this event
          const eventId = uuidv4();
          const slugifiedTitle = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          
          // Create event object
          const event = {
            id: `coastal-jazz-${slugifiedTitle}-${eventId.substring(0, 8)}`,
            title: title,
            description: description || `${title} - part of the TD Vancouver International Jazz Festival. This event brings exceptional jazz music to Vancouver audiences. Visit the official website for more details and ticket information.`,
            startDate: startDate,
            endDate: endDate,
            venue: eventVenue,
            category: 'music',
            categories: ['music', 'jazz', 'festival', 'concert', 'live-music'],
            sourceURL: this.url,
            officialWebsite: eventUrl || this.url,
            image: imageUrl || null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title}`);
        } catch (eventError) {
          console.error(`❌ Error extracting event details: ${eventError.message}`);
        }
      });
      
      console.log(`🎉 Successfully scraped ${events.length} Coastal Jazz Festival events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Coastal Jazz Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new CoastalJazzFestivalScraper();
