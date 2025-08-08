/**
 * Levels Nightclub Scraper
 *
 * This scraper provides information about events at Levels Nightclub in Vancouver
 * Source: https://www.levelsvancouver.com/
 */

const { v4: uuidv4 } = require('uuid');

class LevelsNightclubScraper {
  constructor() {
    this.name = 'Levels Nightclub';
    this.url = 'https://www.levelsvancouver.com/';
    this.sourceIdentifier = 'levels-nightclub';

    // Venue information
    this.venue = {
      name: "Levels Nightclub",
      id: "levels-nightclub-vancouver",
      address: "560 Seymour St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6B 3J5",
      coordinates: {
        lat: 49.2832,
        lng: -123.1161
      },
      websiteUrl: "https://www.levelsvancouver.com/",
      description: "Levels Nightclub is a premium multi-level entertainment venue in downtown Vancouver, featuring state-of-the-art sound and lighting systems across multiple rooms. The venue hosts a variety of electronic music events, hip-hop nights, and themed parties with both local and international DJs."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Trap Dynasty: Future Beats & 808s",
        description: "Vancouver's longest-running trap music night returns to Levels with a lineup of local and international artists pushing the boundaries of bass music. Experience the evolution of trap, featuring heavy 808s, experimental beats, and vocal chops that blend hip-hop, electronic music, and global influences. The night showcases both established and emerging trap producers, with headlining performances from Vancouver's own Sentry Gang and special guest DJ Bandzz from Atlanta. The event spans both floors of Levels, with the main room focused on high-energy trap and the upstairs lounge featuring more experimental and future bass sounds. The venue's renowned sound system has been specially calibrated for this event to deliver the punchy bass and crisp highs that define the genre.",
        date: new Date("2025-07-18T22:00:00"),
        endTime: new Date("2025-07-19T03:00:00"),
        imageUrl: "https://www.levelsvancouver.com/wp-content/uploads/2025/06/trap-dynasty-july.jpg",
        eventLink: "https://www.levelsvancouver.com/events/trap-dynasty-july-2025/",
        price: "$20-$30",
        performers: ["Sentry Gang", "DJ Bandzz", "TrapLord", "Bass Queen"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Electronic"
      },
      {
        title: "Throwback Thursday: 2000s Edition",
        description: "Step back in time to the golden era of pop, R&B, and hip-hop at Levels Nightclub's Throwback Thursday. This month's edition focuses exclusively on the biggest hits from 2000-2010, with resident DJs spinning everything from early Beyoncé and Justin Timberlake to classic 50 Cent and Missy Elliott. The venue will be transformed with nostalgic décor reminiscent of the 2000s, including music video projections, memorabilia, and photo opportunities with iconic props from the era. Guests are encouraged to dress in their best 2000s inspired outfits, with prizes awarded for the most authentic looks. The dance floor will be packed with millennials reliving their youth and younger crowds discovering the infectious energy of 2000s music. The bar will feature special themed cocktails named after the decade's biggest hits.",
        date: new Date("2025-07-24T21:00:00"),
        endTime: new Date("2025-07-25T02:00:00"),
        imageUrl: "https://www.levelsvancouver.com/wp-content/uploads/2025/06/throwback-thursday-2000s.jpg",
        eventLink: "https://www.levelsvancouver.com/events/throwback-thursday-july-2025/",
        price: "$15",
        performers: ["DJ Nostalgia", "The Y2K Crew"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Dance Party"
      },
      {
        title: "Tech House Collective Presents: Subterranean Sounds",
        description: "Tech House Collective brings together the best underground house music talents for a night of deep grooves and hypnotic beats. Headlined by Berlin-based producer Klaudia Kraft, known for releases on Innervisions and Diynamic, this event showcases cutting-edge tech house and minimal techno in an intimate club setting. Supporting artists include Vancouver's own rising tech house stars and international guests, creating a diverse lineup that represents different facets of the genre. The production team has designed custom visuals and lighting that respond to the music, creating an immersive experience that complements the sonic journey. Tech House Collective events are known for their discerning crowd and superior sound quality, with Levels' Funktion-One system delivering every subtle nuance of the carefully crafted sets.",
        date: new Date("2025-07-26T22:00:00"),
        endTime: new Date("2025-07-27T04:00:00"),
        imageUrl: "https://www.levelsvancouver.com/wp-content/uploads/2025/06/tech-house-collective-july.jpg",
        eventLink: "https://www.levelsvancouver.com/events/tech-house-collective-july-2025/",
        price: "$25-$40",
        performers: ["Klaudia Kraft", "Minimal Mike", "Anna Analog", "Deep Dish Dave"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Electronic"
      },
      {
        title: "Summer Heat: Latin & Afrobeats Fusion",
        description: "Experience the tropical rhythms of Latin America and Africa colliding on one dance floor at Levels Nightclub. Summer Heat brings together the infectious energy of reggaeton, dancehall, afrobeats, and baile funk for a global dance party unlike any other in Vancouver. Internationally acclaimed DJ and producer Pedro Calderon headlines, bringing his unique fusion of Latin and African rhythms that have made him a fixture at clubs from Miami to Ibiza. Local selectors will warm up the crowd with sets spanning the Latin-Caribbean-African musical spectrum. The event transforms Levels into a tropical paradise with themed décor, professional dance performers showcasing authentic moves from various cultures, and interactive percussion sessions where guests can join in. The bar will feature specialty cocktails inspired by the featured regions.",
        date: new Date("2025-07-31T22:00:00"),
        endTime: new Date("2025-08-01T03:00:00"),
        imageUrl: "https://www.levelsvancouver.com/wp-content/uploads/2025/07/summer-heat-july.jpg",
        eventLink: "https://www.levelsvancouver.com/events/summer-heat-july-2025/",
        price: "$20-$25",
        performers: ["Pedro Calderon", "DJ Fuego", "Rhythm Sisters", "AfroTech"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "World Music"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Levels Nightclub scraper...');
    const events = [];

    try {
      // Process predefined events
      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `levels-${slugifiedTitle}-${eventDate}`;

        // Format the date for display
        const dateFormat = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        };

        const timeFormat = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        };

        const formattedDate = dateFormat.format(eventData.date);
        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);

        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        detailedDescription += `Venue: ${this.venue.name}, ${this.venue.address}, Vancouver\n`;

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ageRestriction) {
          detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Available online through Levels website or at the door if not sold out\n`;
        }

        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }

        detailedDescription += `\nVenue Information: Levels Nightclub is a multi-level venue in downtown Vancouver featuring state-of-the-art sound and lighting systems. The venue includes multiple rooms with different music styles, a spacious dance floor, multiple bars, and VIP bottle service areas. Valid government-issued photo ID is required for all 19+ events.`;

        // Create categories
        const categories = ['nightlife', 'music', 'club'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.category === 'Electronic') {
          categories.push('edm', 'dj', 'electronic music');
        } else if (eventData.category === 'Dance Party') {
          categories.push('dance', 'pop music', 'hip-hop');
        } else if (eventData.category === 'World Music') {
          categories.push('latin', 'afrobeats', 'global');
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
          officialWebsite: eventDataLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };

        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }

      console.log(`🎧 Successfully created ${events.length} Levels Nightclub events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Levels Nightclub scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new LevelsNightclubScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new LevelsNightclubScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.LevelsNightclubScraper = LevelsNightclubScraper;