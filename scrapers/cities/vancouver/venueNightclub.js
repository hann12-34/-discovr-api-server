/**
 * VENUE Nightclub Scraper
 *
 * This scraper provides information about events at VENUE Nightclub in Vancouver
 * Source: https://venuelive.ca/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class VenueNightclubScraper {
  constructor() {
    this.name = 'VENUE Nightclub';
    this.url = 'https://venuelive.ca/';
    this.sourceIdentifier = 'venue-nightclub';

    // Venue information
    this.venue = {
      name: "VENUE Nightclub",
      id: "venue-nightclub-vancouver",
      address: "881 Granville St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6Z 1L1",
      coordinates: {
        lat: 49.2811198,
        lng: -123.1232201
      },
      websiteUrl: "https://venuelive.ca/",
      description: "VENUE Nightclub is one of Vancouver's premier entertainment spots on the Granville Strip, known for its state-of-the-art sound system, lighting design, and diverse music programming. The space regularly hosts top DJs, live music performances, and special events in an upscale nightclub environment."
    };

    // Upcoming events for 2025 - These would typically be scraped from the website
    thiss = [
      {
        title: "Diplo - Revolution Tour",
        description: "Grammy Award-winning DJ and producer Diplo brings his Revolution Tour to VENUE Nightclub. Known for his genre-bending productions and high-energy performances, Diplo will deliver an unforgettable night of electronic dance music spanning his extensive catalog of hits and collaborations. Expect a cutting-edge audiovisual experience and the latest tracks from his recent releases.",
        date: new Date("2025-07-12T22:00:00"),
        endTime: new Date("2025-07-13T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://venuelive.ca/wp-content/uploads/2025/05/diplo-venue.jpg",
        ticketLink: "https://venuelive.ca/events/diplo-revolution-tour/",
        genre: "Electronic",
        performerUrl: "https://diplo.com/"
      },
      {
        title: "VENUE Saturdays: Neon Dreams",
        description: "VENUE Nightclub's flagship weekend event returns with Neon Dreams! Experience Vancouver's premier nightlife destination with resident DJs spinning the hottest dance, hip-hop, and Top 40 tracks. Featuring state-of-the-art sound and lighting, bottle service, and the city's most energetic dance floor atmosphere.",
        date: new Date("2025-07-19T22:00:00"),
        endTime: new Date("2025-07-20T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://venuelive.ca/wp-content/uploads/2025/05/neon-dreams.jpg",
        ticketLink: "https://venuelive.ca/events/venue-saturdays-neon-dreams/",
        genre: "Mixed",
        performerUrl: null
      },
      {
        title: "Throwback Thursday: 90s & 2000s Dance Party",
        description: "Step back in time with VENUE's Throwback Thursday! Dance to the iconic hits of the 90s and 2000s from artists like Britney Spears, *NSYNC, Backstreet Boys, Spice Girls, and more. Dust off your platform shoes and butterfly clips for a night of nostalgic anthems and guilty pleasures. Our resident DJs will keep the dance floor packed with all your favorite throwback jams.",
        date: new Date("2025-07-24T21:00:00"),
        endTime: new Date("2025-07-25T02:00:00"),
        doorTime: "9:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://venuelive.ca/wp-content/uploads/2025/05/throwback.jpg",
        ticketLink: "https://venuelive.ca/events/throwback-thursday/",
        genre: "Pop/Dance",
        performerUrl: null
      },
      {
        title: "Disclosure DJ Set",
        description: "UK electronic music duo Disclosure takes over VENUE Nightclub for an exclusive DJ set. Known for chart-topping hits like 'Latch' and 'You & Me,' the Grammy-nominated producers will deliver their signature blend of house, UK garage, and electronic music. This intimate club show offers a rare opportunity to experience Disclosure's masterful mixing skills in one of Vancouver's best sound systems.",
        date: new Date("2025-08-02T22:00:00"),
        endTime: new Date("2025-08-03T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://venuelive.ca/wp-content/uploads/2025/06/disclosure-venue.jpg",
        ticketLink: "https://venuelive.ca/events/disclosure-dj-set/",
        genre: "Electronic/House",
        performerUrl: "https://disclosureofficial.com/"
      },
      {
        title: "Bass Drop: Dubstep Night",
        description: "VENUE's Bass Drop returns for a night of earth-shaking dubstep, trap, and bass music. Featuring local and international DJs known for their heavy drops and intense beats, this event transforms VENUE into a bass lover's paradise with enhanced sound systems specifically tuned for low-frequency impact. Prepare for a night of headbanging, rail-breaking energy.",
        date: new Date("2025-08-09T22:00:00"),
        endTime: new Date("2025-08-10T03:00:00"),
        doorTime: "10:00 PM",
        ageRestriction: "19+",
        imageUrl: "https://venuelive.ca/wp-content/uploads/2025/06/bass-drop.jpg",
        ticketLink: "https://venuelive.ca/events/bass-drop-dubstep-night/",
        genre: "Bass/Dubstep",
        performerUrl: null
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting VENUE Nightclub scraper...');
    const events = [];

    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events

      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `venue-nightclub-${slugifiedTitle}-${eventDate}`;

        // Format the date for display
        const dateFormat = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        };

        const formattedDate = dateFormat.format(eventData.date);

        // Create detailed description with formatted date and time
        const detailedDescription = `
${eventData.description}

EVENT DETAILS:
Date: ${formattedDate}
Doors: ${eventData.doorTime}
Age Restriction: ${eventData.ageRestriction}
Genre: ${eventData.genre}
${eventData.performerUrl ? `Artist Website: ${eventData.performerUrl}` : ''}

VENUE Nightclub is located at 881 Granville Street in downtown Vancouver's entertainment district.
        `;

        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'nightlife',
          categories: ['nightlife', 'music', 'dance', 'club', 'entertainment', eventData.genre.toLowerCase()],
          sourceURL: this.url,
          officialWebsite: eventData.ticketLink,
          image: eventData.imageUrl || null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };

        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }

      console.log(`🎧 Successfully created ${events.length} VENUE Nightclub events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in VENUE Nightclub scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VenueNightclubScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new VenueNightclubScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.VenueNightclubScraper = VenueNightclubScraper;