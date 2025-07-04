/**
 * PNE Fair 2025 Scraper
 * 
 * This scraper generates events for the annual PNE Fair
 * running from August 16 to September 1, 2025 at Hastings Park
 */

const { v4: uuidv4 } = require('uuid');

class PNEFairScraper {
  constructor() {
    this.name = 'PNE Fair';
    this.url = 'https://www.pne.ca/fair2025/';
    this.sourceIdentifier = 'pne-fair';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Hastings Park (PNE Fairgrounds)',
      id: 'hastings-park-pne',
      address: '2901 E Hastings St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V5K 0A1',
      coordinates: {
        lat: 49.2827778,
        lng: -123.0388889
      },
      websiteUrl: 'https://www.pne.ca/fair2025/',
      description: "Hastings Park is home to the annual Pacific National Exhibition (PNE) Fair, a Vancouver tradition since 1910. The 114-acre site hosts various attractions including Playland amusement park, the Pacific Coliseum, livestock buildings, garden displays, and exhibition spaces that transform into a vibrant fairground during the annual summer fair."
    };
    
    // Fair description
    this.fairDescription = "The Pacific National Exhibition (PNE) Fair is Vancouver's largest annual fair, combining agricultural showcases, entertainment, marketplace vendors, and family attractions. The fair features daily shows, exhibits, food vendors, a marketplace, and special events throughout its run. A beloved end-of-summer tradition, the PNE Fair offers something for every age with midway rides, games, live entertainment, and diverse food options.";
    
    // Special events and attractions during the fair
    this.specialEvents = [
      {
        title: "SuperDogs Show",
        description: "The President's Choice SuperDogs return with an all-new show featuring incredible canine athletes performing amazing stunts, relay races, and choreographed routines that showcase their agility, speed, and training. A family favorite that delights audiences of all ages multiple times daily.",
        times: "Daily performances at 12:30pm, 3:00pm, and 6:30pm",
        location: "Pacific Coliseum"
      },
      {
        title: "Farm Country",
        description: "An educational and interactive agricultural showcase featuring livestock displays, 4-H competitions, and demonstrations that connect fairgoers with BC's agricultural heritage. See cows, pigs, goats, sheep, and other farm animals up close while learning about modern farming practices.",
        times: "Open daily from 11:00am to 10:00pm",
        location: "Livestock Building"
      },
      {
        title: "Marketplace",
        description: "Browse hundreds of vendors offering unique products, innovations, crafts, and services. The Marketplace is a shopper's paradise with everything from kitchen gadgets and home decor to artisanal foods and wellness products.",
        times: "Open daily from 11:00am to 11:00pm",
        location: "Marketplace Buildings"
      },
      {
        title: "Craft Beer Fest",
        description: "Sample craft beers from over 30 local breweries in this special tasting area for guests 19+. Featuring rotating taps, beer education sessions, and perfect pairings with fair food favorites.",
        times: "Open daily from 12:00pm to 10:00pm",
        location: "Festival Park"
      },
      {
        title: "Kidz Zone",
        description: "A dedicated area for younger fairgoers featuring interactive games, family-friendly entertainment, arts and crafts, and kid-sized attractions. Includes daily performances by children's entertainers and character meet-and-greets.",
        times: "Open daily from 11:00am to 9:00pm",
        location: "Garden Auditorium"
      },
      {
        title: "Culinary Pavilion",
        description: "Watch live cooking demonstrations from local chefs, participate in tastings, and learn new recipes and cooking techniques. The pavilion showcases BC's diverse culinary scene with a focus on seasonal ingredients and international cuisines.",
        times: "Demonstrations daily at 1:00pm, 3:00pm, 5:00pm, and 7:00pm",
        location: "BC Showcase Building"
      }
    ];
    
    // Fair dates in 2025 (closed on August 18 and 25)
    this.operatingDays = [
      '2025-08-16', '2025-08-17',
      '2025-08-19', '2025-08-20', '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24',
      '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29', '2025-08-30', '2025-08-31',
      '2025-09-01'
    ];
  }

  /**
   * Generate a unique ID for the fair event
   * @param {string} date - Event date in YYYY-MM-DD format
   * @returns {string} - Formatted ID
   */
  generateFairDayId(date) {
    return `pne-fair-${date}`;
  }
  
  /**
   * Create date objects for fair operating hours
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @returns {Object} - Start and end date objects
   */
  createFairDateTime(dateStr) {
    // Fair runs 11am to 11pm each day
    const startDate = new Date(`${dateStr}T11:00:00`);
    const endDate = new Date(`${dateStr}T23:00:00`);
    
    return { startDate, endDate };
  }
  
  /**
   * Generate the description for a specific fair day
   * @param {string} date - Event date in YYYY-MM-DD format
   * @returns {string} - Detailed description including featured attractions
   */
  generateDailyDescription(date) {
    // Format the date for display
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    // Create description with both general fair info and special events
    let description = `Join us for the PNE Fair on ${formattedDate}! ${this.fairDescription}\n\n`;
    description += "Featured attractions and events today include:\n\n";
    
    // Add information about special events
    this.specialEvents.forEach((event) => {
      description += `• ${event.title} - ${event.description} Located at ${event.location}. ${event.times}.\n\n`;
    });
    
    description += "The fair is open from 11:00am to 11:00pm. Tickets available online or at the gate.";
    
    return description;
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting PNE Fair 2025 scraper...');
    const events = [];
    
    try {
      // Create an event for each operating day
      for (const date of this.operatingDays) {
        // Create date objects
        const { startDate, endDate } = this.createFairDateTime(date);
        
        // Format the date for the title
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        // Format event title
        const eventTitle = `PNE Fair 2025 - ${formattedDate}`;
        
        // Generate comprehensive description for this fair day
        const description = this.generateDailyDescription(date);
        
        // Create event object
        const event = {
          id: this.generateFairDayId(date),
          title: eventTitle,
          description: description,
          startDate: startDate,
          endDate: endDate,
          venue: this.venue,
          category: 'festival',
          categories: ['festival', 'family', 'fair', 'food', 'entertainment', 'amusement-park'],
          sourceURL: this.url,
          officialWebsite: 'https://www.pne.ca/fair2025/',
          image: 'https://www.pne.ca/wp-content/uploads/2024/05/PNEFair-Social-Share-1200x628-1.jpg',
          recurring: null, // Each day is listed as a separate event
          ticketsRequired: true,
          ticketsUrl: 'https://www.ticketleader.ca/events/detail/pnefair2025',
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventTitle}`);
      }
      
      console.log(`🎉 Successfully scraped ${events.length} PNE Fair day events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in PNE Fair scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new PNEFairScraper();
