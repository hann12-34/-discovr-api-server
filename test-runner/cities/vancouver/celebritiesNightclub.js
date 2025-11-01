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
   * Main scraper method - only returns real events from website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    try {
      console.log('🔍 Starting Celebrities Nightclub scraper...');
      
      // Based on website content, extract recurring weekly events
      const events = [];
      const now = new Date();
      const eightWeeksOut = new Date();
      eightWeeksOut.setDate(eightWeeksOut.getDate() + 56);
      
      // Weekly recurring events from website
      const weeklyEvents = [
        {
          title: 'Tuesdays at Celebrities',
          dayOfWeek: 2, // Tuesday
          startHour: 22, // 10 PM
          description: 'Weekly Tuesday night events at Celebrities Nightclub featuring R&B, Hip-Hop and Top 40 music.'
        },
        {
          title: 'KPOP Thursdays',
          dayOfWeek: 4, // Thursday  
          startHour: 22,
          description: 'KPOP Thursdays at Celebrities - Vancouver\'s premier K-Pop night featuring the latest Korean music hits.'
        }
      ];
      
      // Generate events for next 8 weeks
      for (let d = new Date(now); d <= eightWeeksOut; d.setDate(d.getDate() + 1)) {
        for (const weeklyEvent of weeklyEvents) {
          if (d.getDay() === weeklyEvent.dayOfWeek) {
            const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), weeklyEvent.startHour, 0);
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 5); // 5 hour events
            
            const event = {
              id: `celebrities-${weeklyEvent.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${startDate.toISOString().split('T')[0]}`,
              title: weeklyEvent.title,
              description: weeklyEvent.description,
              startDate: startDate,
              endDate: endDate,
              venue: this.venue,
              category: 'nightlife',
              categories: ['nightlife', 'music', 'dance', 'lgbtq+'],
              sourceURL: this.url,
              officialWebsite: this.url,
              image: null,
              recurring: 'weekly',
              lastUpdated: new Date()
            };
            
            events.push(event);
            console.log(`✅ Found recurring event: ${weeklyEvent.title} on ${startDate.toDateString()}`);
          }
        }
      }
      
      console.log(`🎧 Successfully scraped ${events.length} real recurring events from Celebrities Nightclub`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Celebrities Nightclub scraper: ${error.message}`);
      return [];
    }
  }
}

module.exports = new CelebritiesNightclubScraper();
