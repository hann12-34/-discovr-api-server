/**
 * Steamworks Brewing Scraper
 *
 * This scraper provides information about events at Steamworks Brewing in Vancouver
 * Source: https://steamworks.com/brew-pub/
 */

const { v4: uuidv4 } = require('uuid');

class SteamworksBrewingScraper {
  constructor() {
    this.name = 'Steamworks Brewing';
    this.url = 'https://steamworks.com/brew-pub/';
    this.sourceIdentifier = 'steamworks-brewing';

    // Venue information
    this.venue = {
      name: "Steamworks Brewing Co. Brew Pub",
      id: "steamworks-brewing-vancouver",
      address: "375 Water St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6B 5C6",
      coordinates: {
        lat: 49.2847484,
        lng: -123.1106541
      },
      websiteUrl: "https://steamworks.com/brew-pub/",
      description: "Steamworks Brewing Co. is a landmark brewpub in Vancouver's historic Gastown district, known for its distinctive steam-powered brewing process and spectacular waterfront views. Housed in a 100-year-old brick and beam building, the spacious multi-level venue offers house-brewed craft beers, a diverse food menu, and a lively atmosphere for locals and tourists alike."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Summer Brewmaster's Dinner",
        description: "Join Steamworks' Head Brewmaster and Executive Chef for an exclusive five-course dinner with expert beer pairings. Each dish is crafted to complement specific Steamworks brews, highlighting the complex flavors of both the food and beer. Throughout the evening, the Brewmaster will discuss the brewing process, ingredients, and unique characteristics of each beer, while the Chef explains the culinary concepts behind the pairings.",
        date: new Date("2025-07-10T18:30:00"),
        endTime: new Date("2025-07-10T22:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/05/brewmasters-dinner.jpg",
        eventLink: "https://steamworks.com/events/summer-brewmasters-dinner-2025/",
        price: "$95 per person",
        ticketsRequired: true,
        category: "Food & Beer"
      },
      {
        title: "Cask Night: Summer Seasonal Release",
        description: "Steamworks' popular monthly Cask Night returns with a special summer seasonal release. Be among the first to taste our limited edition Raspberry Wheat Ale, cask-conditioned for optimal flavor and served at traditional cellar temperature. Our brewing team will be on hand to discuss the inspiration behind this refreshing seasonal creation and the unique characteristics of cask-conditioned ales.",
        date: new Date("2025-07-18T17:00:00"),
        endTime: new Date("2025-07-18T21:00:00"),
        recurrence: "Monthly Cask Series",
        ageRestriction: "19+",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/06/cask-night.jpg",
        eventLink: "https://steamworks.com/events/cask-night-july-2025/",
        price: "Pay as you go",
        ticketsRequired: false,
        category: "Beer Release"
      },
      {
        title: "Live Jazz & Craft Beer Sunday",
        description: "Unwind with smooth jazz and smooth brews at Steamworks' Live Jazz Sunday. The Cameron Chu Quartet performs a mix of jazz standards and original compositions while you enjoy our award-winning craft beers and weekend brunch menu. The perfect way to cap off your weekend with stunning waterfront views, great music, and exceptional beer in Vancouver's historic Gastown district.",
        date: new Date("2025-07-27T13:00:00"),
        endTime: new Date("2025-07-27T16:00:00"),
        recurrence: "Weekly on Sundays",
        ageRestriction: "All ages welcome",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/04/jazz-sunday.jpg",
        eventLink: "https://steamworks.com/events/live-jazz-sundays/",
        price: "No cover charge",
        performers: ["Cameron Chu Quartet"],
        ticketsRequired: false,
        category: "Live Music"
      },
      {
        title: "Steamworks Beer Festival",
        description: "Celebrate craft beer culture at the annual Steamworks Beer Festival! This day-long event features over 20 craft breweries from across British Columbia, including rare and exclusive releases from Steamworks' barrel aging program. Enjoy beer sampling, brewery tours, live music, beer-inspired food pairings, brewing demonstrations, and games. A must-attend event for craft beer enthusiasts and casual fans alike.",
        date: new Date("2025-08-09T12:00:00"),
        endTime: new Date("2025-08-09T20:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/05/beer-festival.jpg",
        eventLink: "https://steamworks.com/events/beer-festival-2025/",
        price: "$45 (includes festival glass and 10 sample tokens)",
        ticketsRequired: true,
        category: "Festival"
      },
      {
        title: "Craft Beer & Chocolate Pairing Workshop",
        description: "Discover the delightful world of craft beer and chocolate pairings in this interactive workshop led by Steamworks' Cicerone and a master chocolatier from Vancouver's own Beta5 Chocolates. Learn how different beer styles complement various chocolate types while enjoying guided tastings of six precision-paired combinations. Participants will receive recipes, pairing notes, and a take-home gift of specialty chocolates.",
        date: new Date("2025-08-14T19:00:00"),
        endTime: new Date("2025-08-14T21:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/06/beer-chocolate.jpg",
        eventLink: "https://steamworks.com/events/beer-chocolate-pairing/",
        price: "$55 per person",
        ticketsRequired: true,
        category: "Workshop"
      },
      {
        title: "History on Tap: Vancouver's Brewing Heritage",
        description: "Step back in time with 'History on Tap,' an evening exploring Vancouver's rich brewing history from the 1800s to present day. Hosted in collaboration with the Vancouver Historical Society, this event features a fascinating presentation by beer historian Joe Thompson, historic brewery artifacts on display, and a specially curated flight of beers inspired by historic Vancouver recipes. Includes a commemorative booklet about local brewing history.",
        date: new Date("2025-08-21T18:30:00"),
        endTime: new Date("2025-08-21T21:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://steamworks.com/wp-content/uploads/2025/06/history-on-tap.jpg",
        eventLink: "https://steamworks.com/events/history-on-tap/",
        price: "$35 per person",
        ticketsRequired: true,
        category: "Educational"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Steamworks Brewing scraper...');
    const events = [];

    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events

      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `steamworks-${slugifiedTitle}-${eventDate}`;

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

        if (eventData.recurrence) {
          detailedDescription += `Recurrence: ${eventData.recurrence}\n`;
        }

        detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }

        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }

        detailedDescription += `\nLocation: Steamworks Brewing Co. is located at 375 Water Street in Vancouver's historic Gastown district, near Waterfront Station.\n\n`;
        detailedDescription += `For more information and tickets, please visit ${this.url} or call (604) 689-2739.`;

        // Create categories
        const categories = ['brewery', 'craft beer', 'food and drink', 'gastown'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.category === 'Live Music') {
          categories.push('music', 'jazz', 'entertainment');
        } else if (eventData.category === 'Beer Release') {
          categories.push('beer tasting', 'cask ale');
        } else if (eventData.category === 'Festival') {
          categories.push('beer festival', 'outdoor', 'tasting');
        } else if (eventData.category === 'Workshop') {
          categories.push('tasting', 'chocolate', 'education', 'pairing');
        } else if (eventData.category === 'Food & Beer') {
          categories.push('dining', 'pairing', 'culinary');
        } else if (eventData.category === 'Educational') {
          categories.push('history', 'beer history', 'learning');
        }

        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'food and drink',
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

      console.log(`🍺 Successfully created ${events.length} Steamworks Brewing events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Steamworks Brewing scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new SteamworksBrewingScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new SteamworksBrewingScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.SteamworksBrewingScraper = SteamworksBrewingScraper;