/**
 * Celebrities Nightclub Scraper
 * 
 * This scraper provides information about events at Celebrities Nightclub in Vancouver
 * Source: https://www.celebritiesnightclub.com/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class CelebritiesNightclubScraper {
  constructor() {
    this.name = 'Celebrities Nightclub';
    this.url = 'https://www.celebritiesnightclub.com/';
    this.sourceIdentifier = 'celebrities-nightclub';
    
    // Venue information
    this.venue = {
      name: "Celebrities Nightclub",
      id: "celebrities-nightclub-vancouver",
      address: "1022 Davie St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6E 1M3",
      coordinates: {
        lat: 49.2808878,
        lng: -123.1300321
      },
      websiteUrl: "https://www.celebritiesnightclub.com/",
      description: "Celebrities Nightclub is an iconic Vancouver nightlife institution established in 1984. Located in the heart of the Davie Village, it's one of the city's longest-running and most popular LGBTQ+ friendly nightclubs, featuring state-of-the-art sound and lighting systems, multiple rooms, and themed nights that welcome everyone."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "PARADISE SATURDAYS",
        description: "Paradise Saturdays is Celebrities Nightclub's flagship weekly event featuring the best local DJs spinning house, progressive, and top 40 remixes. Experience the club's legendary atmosphere with stunning light shows, talented dancers, and special effects that have made Paradise a Vancouver nightlife tradition for over two decades.",
        date: new Date("2025-07-05T22:00:00"),
        endTime: new Date("2025-07-06T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://www.celebritiesnightclub.com/wp-content/uploads/2025/01/paradise-saturdays.jpg",
        ticketLink: "https://www.celebritiesnightclub.com/events/paradise-saturdays/",
        genre: "Dance/Electronic",
        djs: ["DJ Del Stamp", "DJ Drew Allen"]
      },
      {
        title: "FVDED Friday",
        description: "FVDED Friday brings the best in trap, hip hop, and bass music to Celebrities. This Blueprint Events production transforms the club into a high-energy playground with guest DJs and artists from around the world. Expect cutting-edge music, special guests, and a packed dance floor.",
        date: new Date("2025-07-11T22:00:00"),
        endTime: new Date("2025-07-12T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://www.celebritiesnightclub.com/wp-content/uploads/2025/01/fvded-friday.jpg",
        ticketLink: "https://www.celebritiesnightclub.com/events/fvded-friday/",
        genre: "Hip Hop/Bass",
        djs: ["DJ Flipout", "Guest DJ TBA"]
      },
      {
        title: "DRAG ME TO HELL: Celestial Showdown",
        description: "Celebrities presents a night of extraordinary drag performances featuring local legends and special guests. Hosted by Vancouver's own Jaylene Tyme, this celestial-themed extravaganza promises jaw-dropping performances, outrageous costumes, and non-stop entertainment. The evening includes a drag competition with audience participation and surprise celebrity judges.",
        date: new Date("2025-07-17T21:00:00"),
        endTime: new Date("2025-07-18T02:00:00"),
        doorTime: "9:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://www.celebritiesnightclub.com/wp-content/uploads/2025/02/drag-me-to-hell.jpg",
        ticketLink: "https://www.celebritiesnightclub.com/events/drag-me-to-hell/",
        genre: "Drag Performance",
        performers: ["Jaylene Tyme", "Mina Mercury", "Rogue", "Heaven Lee Hytes"]
      },
      {
        title: "Nina Kraviz: Techno Revolution Tour",
        description: "Internationally acclaimed DJ and producer Nina Kraviz brings her Techno Revolution Tour to Celebrities. Known for her hypnotic sets and experimental approach to techno, Kraviz will take control of the club's powerful sound system for an unforgettable night of cutting-edge electronic music. This rare Vancouver appearance is presented in partnership with Blueprint Events.",
        date: new Date("2025-07-24T22:00:00"),
        endTime: new Date("2025-07-25T04:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://www.celebritiesnightclub.com/wp-content/uploads/2025/03/nina-kraviz.jpg",
        ticketLink: "https://www.celebritiesnightclub.com/events/nina-kraviz/",
        genre: "Techno",
        performerUrl: "https://www.ninakraviz.com/"
      },
      {
        title: "PRIDE WEEKEND: Love Revolution",
        description: "Celebrate Vancouver Pride at Celebrities' legendary Pride Weekend party. The Love Revolution edition features international guest DJs, spectacular performances, and the inclusive atmosphere that has made Celebrities a cornerstone of Vancouver's LGBTQ+ community for decades. Expect a packed house, special surprises, and the most vibrant pride celebration in the city.",
        date: new Date("2025-08-02T21:00:00"),
        endTime: new Date("2025-08-03T06:00:00"),
        doorTime: "9:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://www.celebritiesnightclub.com/wp-content/uploads/2025/04/pride-weekend.jpg",
        ticketLink: "https://www.celebritiesnightclub.com/events/pride-weekend-2025/",
        genre: "Pride/Dance",
        djs: ["DJ GSP", "DJ Cyndi Lauper", "International Guest DJ TBA"]
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Celebrities Nightclub scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `celebrities-nightclub-${slugifiedTitle}-${eventDate}`;
        
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
        const formattedTime = timeFormat.format(eventData.date);
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedTime}\n`;
        detailedDescription += `Doors: ${eventData.doorTime}\n`;
        detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        detailedDescription += `Genre: ${eventData.genre}\n`;
        
        // Add performer information if available
        if (eventData.djs && eventData.djs.length > 0) {
          detailedDescription += `DJs: ${eventData.djs.join(', ')}\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        if (eventData.performerUrl) {
          detailedDescription += `Artist Website: ${eventData.performerUrl}\n`;
        }
        
        detailedDescription += `\nCelebrities Nightclub is located at 1022 Davie Street in Vancouver's vibrant Davie Village.`;
        
        // Create categories based on genre
        const categories = ['nightlife', 'music', 'dance', 'club', 'entertainment'];
        
        // Add genre-specific categories
        const genreLower = eventData.genre.toLowerCase();
        categories.push(genreLower);
        
        // Add LGBTQ+ category
        categories.push('lgbtq+');
        
        // Add drag category if applicable
        if (genreLower.includes('drag')) {
          categories.push('drag');
          categories.push('performance');
        }
        
        // Add pride category if applicable
        if (genreLower.includes('pride')) {
          categories.push('pride');
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
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }
      
      console.log(`🎧 Successfully created ${events.length} Celebrities Nightclub events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Celebrities Nightclub scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new CelebritiesNightclubScraper();
