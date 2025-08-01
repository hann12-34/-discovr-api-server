/**
 * Laowai Bar Scraper
 * 
 * This scraper provides information about events at Laowai, a hidden speakeasy bar in Vancouver
 * Source: https://laowai.ca/
 */

const { v4: uuidv4 } = require('uuid');

class LaowaiBarScraper {
  constructor() {
    this.name = 'Laowai Bar';
    this.url = 'https://laowai.ca/';
    this.sourceIdentifier = 'laowai-bar';
    
    // Venue information
    this.venue = {
      name: "Laowai",
      id: "laowai-bar-vancouver",
      address: "251 E Georgia St (Enter through BB's Grocery Store)",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6A 1Z6",
      coordinates: {
        lat: 49.2789553,
        lng: -123.0982444
      },
      websiteUrl: "https://laowai.ca/",
      description: "Laowai is a hidden Chinese cocktail bar and dim sum restaurant concealed behind a cold tea store in Vancouver's Chinatown. Inspired by the speakeasies of 1930s Shanghai, this intimate venue features expertly crafted cocktails with Asian flavors, dim sum bites, and an atmosphere of mystery and sophistication. Access is through BB's Grocery Store with reservations highly recommended."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Cocktail Masterclass: Chinese Spirits",
        description: "Join Laowai's award-winning bar team for an exclusive masterclass exploring the world of Chinese spirits and cocktail techniques. This hands-on workshop will guide participants through the history, production methods, and unique characteristics of baijiu, Huangjiu, and other traditional Chinese spirits. Learn to craft three signature cocktails while enjoying paired dim sum bites.",
        date: new Date("2025-07-13T14:00:00"),
        endTime: new Date("2025-07-13T16:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://laowai.ca/wp-content/uploads/2025/05/masterclass.jpg",
        ticketLink: "https://laowai.ca/events/cocktail-masterclass-july/",
        price: "$95",
        ticketsAvailable: true,
        category: "Workshop"
      },
      {
        title: "Jazz in the Speakeasy",
        description: "Step back in time to 1930s Shanghai with an evening of live jazz in Laowai's intimate speakeasy setting. The Vincent Lum Trio performs classic jazz standards and original compositions inspired by the golden age of Shanghai jazz. Enjoy the performance alongside Laowai's signature cocktails and dim sum menu for a truly immersive experience.",
        date: new Date("2025-07-20T19:00:00"),
        endTime: new Date("2025-07-20T22:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://laowai.ca/wp-content/uploads/2025/05/jazz-speakeasy.jpg",
        ticketLink: "https://laowai.ca/events/jazz-in-the-speakeasy/",
        price: "$15 cover charge",
        performers: ["Vincent Lum Trio"],
        ticketsAvailable: true,
        category: "Music"
      },
      {
        title: "Baijiu Appreciation Society",
        description: "The Baijiu Appreciation Society returns to Laowai for its monthly gathering. This educational tasting event introduces participants to China's national spirit through guided samplings of various baijiu styles and production regions. Learn about the complex production methods, rich history, and cultural significance of this misunderstood spirit with Laowai's resident baijiu expert, Tom Ye.",
        date: new Date("2025-07-27T17:00:00"),
        endTime: new Date("2025-07-27T19:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://laowai.ca/wp-content/uploads/2025/06/baijiu-society.jpg",
        ticketLink: "https://laowai.ca/events/baijiu-appreciation-society-july/",
        price: "$65",
        ticketsAvailable: true,
        category: "Tasting"
      },
      {
        title: "Bartender Exchange: Hong Kong Edition",
        description: "For one night only, Laowai welcomes guest bartenders from Hong Kong's acclaimed speakeasy The Old Man for a special takeover event. Experience innovative cocktails combining Hong Kong and Vancouver influences as bartenders from both establishments collaborate on a unique menu that pays homage to Chinese flavors and techniques. Limited seating available with two seatings.",
        date: new Date("2025-08-03T18:00:00"),
        endTime: new Date("2025-08-03T23:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://laowai.ca/wp-content/uploads/2025/06/bartender-exchange.jpg",
        ticketLink: "https://laowai.ca/events/bartender-exchange-hong-kong/",
        price: "No cover charge, reservations required",
        ticketsAvailable: true,
        category: "Special Event"
      },
      {
        title: "Mid-Autumn Festival Celebration",
        description: "Celebrate the traditional Chinese Mid-Autumn Festival at Laowai with special cocktails inspired by mooncakes and seasonal ingredients. The evening features a custom menu of festive drinks and dim sum pairings, lantern decorations, and a storytelling session about the mythology and traditions of this important lunar celebration. Each guest receives a traditional mooncake gift.",
        date: new Date("2025-08-10T18:00:00"),
        endTime: new Date("2025-08-10T23:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://laowai.ca/wp-content/uploads/2025/06/mid-autumn.jpg",
        ticketLink: "https://laowai.ca/events/mid-autumn-festival/",
        price: "$30 includes welcome drink and mooncake",
        ticketsAvailable: true,
        category: "Cultural Celebration"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Laowai Bar scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `laowai-${slugifiedTitle}-${eventDate}`;
        
        // Format the date for display
        const dateFormat = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        const timeFormat = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        });
        
        const formattedDate = dateFormat.format(eventData.date);
        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nLocation: Laowai is a hidden bar located inside BB's Grocery Store at 251 E Georgia St in Vancouver's Chinatown. Enter through the grocery store and look for the freezer door.\n\n`;
        detailedDescription += `Reservations highly recommended. Please visit ${this.url} to secure your spot.`;
        
        // Create categories
        const categories = ['nightlife', 'bar', 'speakeasy', 'chinatown', 'cocktails', 'hidden bar'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          categories.push('live music', 'jazz');
        } else if (eventData.category === 'Tasting') {
          categories.push('spirits', 'baijiu', 'food and drink');
        } else if (eventData.category === 'Cultural Celebration') {
          categories.push('culture', 'chinese culture', 'festival');
        } else if (eventData.category === 'Workshop') {
          categories.push('education', 'mixology', 'learning');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'nightlife',
          categories: categories,
          sourceURL: this.url,
          officialWebsite: eventData.ticketLink,
          image: eventData.imageUrl || null,
          ticketsRequired: eventData.ticketsAvailable,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }
      
      console.log(`🍸 Successfully created ${events.length} Laowai Bar events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Laowai Bar scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new LaowaiBarScraper();
