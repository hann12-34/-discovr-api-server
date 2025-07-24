/**
 * Vancouver Civic Theatres Scraper
 * 
 * This scraper provides information about events at Vancouver Civic Theatres
 * Source: https://vancouvercivictheatres.com/events/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class VancouverCivicTheatresScraper {
  constructor() {
    this.name = 'Vancouver Civic Theatres';
    this.url = 'https://vancouvercivictheatres.com/events/';
    this.sourceIdentifier = 'vancouver-civic-theatres';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Vancouver Civic Theatres',
      id: 'vancouver-civic-theatres',
      address: '630 Hamilton St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 5N6',
      coordinates: {
        lat: 49.2813118,
        lng: -123.1178014
      },
      websiteUrl: 'https://vancouvercivictheatres.com/',
      description: "Vancouver Civic Theatres operates the city's premier performance venues, including the Queen Elizabeth Theatre, Orpheum, Vancouver Playhouse, and Annex. These venues host a variety of performances including Broadway shows, concerts, dance, opera, and more."
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Civic Theatres scraper...');
    const events = [];
    
    try {
      // Fetch event data from the website
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);
      
      // Select all event cards/containers
      $('.event-card, .event-listing').each((i, element) => {
        try {
          // Extract event details (adjust selectors based on actual website structure)
          const title = $(element).find('.event-title').text().trim();
          const dateText = $(element).find('.event-date').text().trim();
          const eventUrl = $(element).find('a').attr('href');
          const imageUrl = $(element).find('img').attr('src');
          const description = $(element).find('.event-description').text().trim();
          
          // Parse dates (this will need adjustment based on actual date format)
          let startDate, endDate;
          
          try {
            // Example date parsing assuming format like "July 25-28, 2025"
            const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d+)(?:-(\d+))?,\s+(\d{4})/);
            if (dateMatch) {
              const month = dateMatch[1];
              const startDay = parseInt(dateMatch[2]);
              const endDay = dateMatch[3] ? parseInt(dateMatch[3]) : startDay;
              const year = parseInt(dateMatch[4]);
              
              const months = {
                'January': 0, 'February': 1, 'March': 2, 'April': 3,
                'May': 4, 'June': 5, 'July': 6, 'August': 7,
                'September': 8, 'October': 9, 'November': 10, 'December': 11
              };
              
              startDate = new Date(year, months[month], startDay);
              endDate = new Date(year, months[month], endDay);
              
              // Default time is 7:30 PM if not specified
              startDate.setHours(19, 30, 0);
              endDate.setHours(22, 0, 0);
            }
          } catch (dateError) {
            console.error(`⚠️ Error parsing date for event "${title}": ${dateError.message}`);
            // Use fallback date if parsing fails
            startDate = new Date();
            startDate.setDate(startDate.getDate() + 30); // Fallback to 30 days from now
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 2);
          }
          
          // Create unique ID for this event
          const eventId = uuidv4();
          
          // Determine categories based on title/description keywords
          const categories = ['performance', 'arts'];
          
          if (title.toLowerCase().includes('concert') || description.toLowerCase().includes('music')) {
            categories.push('music');
          }
          
          if (title.toLowerCase().includes('dance') || description.toLowerCase().includes('dance')) {
            categories.push('dance');
          }
          
          if (title.toLowerCase().includes('theatre') || title.toLowerCase().includes('theater') || 
              description.toLowerCase().includes('theatre') || description.toLowerCase().includes('theater')) {
            categories.push('theatre');
          }
          
          // Create event object
          const event = {
            id: `vancouver-civic-theatres-${eventId}`,
            title: title,
            description: description || `Join us for ${title} at Vancouver Civic Theatres. Visit the official website for more details.`,
            startDate: startDate,
            endDate: endDate,
            venue: this.venue,
            category: 'performance',
            categories: categories,
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
      
      console.log(`🎉 Successfully scraped ${events.length} Vancouver Civic Theatres events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Civic Theatres scraper: ${error.message}`);
      return events;
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new VancouverCivicTheatresScraper();
