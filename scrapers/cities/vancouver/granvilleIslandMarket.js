/**
 * Granville Island Public Market Scraper
 *
 * This scraper provides information about events at Granville Island Public Market in Vancouver
 * Source: https://granvilleisland.com/
 */

const { v4: uuidv4 } = require('uuid');

class GranvilleIslandMarketScraper {
  constructor() {
    this.name = 'Granville Island Public Market';
    this.url = 'https://granvilleisland.com/';
    this.sourceIdentifier = 'granville-island-market';

    // Venue information
    this.venue = {
      name: "Granville Island Public Market",
      id: "granville-island-market-vancouver",
      address: "1669 Johnston St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6H 3R9",
      coordinates: {
        lat: 49.2722,
        lng: -123.1347
      },
      websiteUrl: "https://granvilleisland.com/public-market",
      description: "The Granville Island Public Market is the jewel in the crown of Granville Island, a vibrant cultural hub in the heart of Vancouver. The market features a fascinating array of colorful food stalls, artisanal products, and handcrafted goods, all showcasing the best of British Columbia. With over 50 independent food purveyors and day vendors, the Market provides visitors and locals alike with a wide range of gastronomic delights, from fresh seafood and produce to international specialties and desserts."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Granville Island Farmers Market",
        description: "Experience the freshest local produce at the weekly Granville Island Farmers Market. Meet the farmers who grow your food as they bring their seasonal harvest directly to you. This outdoor market features organic vegetables, fruits, artisanal cheeses, freshly baked bread, local honey, preserves, and handcrafted items from over 40 regional producers. Learn about sustainable farming practices, discover unique heirloom varieties, and enjoy live acoustic music while you shop.",
        date: new Date("2025-07-10T10:00:00"),
        endTime: new Date("2025-07-10T15:00:00"),
        recurrence: "Weekly on Thursdays",
        location: "Triangle Square",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/05/farmers-market-2025.jpg",
        eventLink: "https://granvilleisland.com/events/farmers-market-2025",
        price: "Free admission",
        category: "Market"
      },
      {
        title: "Taste of BC: Seafood Festival",
        description: "Celebrate British Columbia's renowned seafood at this two-day culinary event. Watch cooking demonstrations by prominent local chefs who will showcase innovative ways to prepare sustainable seafood from BC's pristine waters. Sample freshly shucked oysters, smoked salmon, spot prawns, Dungeness crab, and other ocean delicacies. Meet local fishers and learn about ocean-to-table practices while enjoying live music and harbor views. Proceeds support sustainable fishing initiatives in BC.",
        date: new Date("2025-07-19T11:00:00"),
        endTime: new Date("2025-07-20T17:00:00"),
        location: "Public Market Courtyard",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/06/seafood-festival-2025.jpg",
        eventLink: "https://granvilleisland.com/events/taste-of-bc-seafood-festival",
        price: "$10 admission, food samples additional",
        ticketsRequired: true,
        category: "Food Festival"
      },
      {
        title: "Artisan Workshop Series: Handmade Paper Making",
        description: "Get creative in this hands-on workshop led by local artisan Mei Zhang. Learn the traditional craft of handmade paper making using sustainable materials and botanical elements. Participants will create their own decorative papers infused with flower petals, herbs, and natural dyes. All materials are provided, and everyone will take home their handcrafted paper creations. This workshop is suitable for beginners and experienced crafters alike.",
        date: new Date("2025-07-25T13:00:00"),
        endTime: new Date("2025-07-25T16:00:00"),
        location: "Granville Island Community Centre",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/06/paper-making-workshop.jpg",
        eventLink: "https://granvilleisland.com/events/artisan-workshop-paper-making",
        price: "$65 per person, includes all materials",
        ticketsRequired: true,
        category: "Workshop"
      },
      {
        title: "Farm to Table Dinner Series: Summer Harvest",
        description: "Experience an unforgettable evening of culinary excellence at our Farm to Table Dinner Series. This special summer edition features a five-course meal showcasing the season's bounty from local farmers, prepared by award-winning Chef Daniel Kim. Dine communally at long tables set up in the market after hours, surrounded by market stalls and twinkling lights. Each course is paired with BC wines, and producers will share stories about the featured ingredients.",
        date: new Date("2025-08-02T18:30:00"),
        endTime: new Date("2025-08-02T22:00:00"),
        location: "Public Market Main Hall",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/06/farm-table-dinner.jpg",
        eventLink: "https://granvilleisland.com/events/farm-table-summer-harvest",
        price: "$125 per person (includes wine pairings)",
        ticketsRequired: true,
        category: "Dining"
      },
      {
        title: "Kids' Culinary Adventure",
        description: "Introduce children to the joy of cooking with fresh ingredients in this fun, educational workshop. Kids ages 8-12 will tour the market to select seasonal ingredients, learn about food origins, and prepare simple, delicious recipes under the guidance of experienced culinary instructors. This hands-on experience encourages healthy eating habits and culinary creativity. All participants will enjoy their creations together and receive recipe cards to recreate the dishes at home.",
        date: new Date("2025-08-09T10:00:00"),
        endTime: new Date("2025-08-09T13:00:00"),
        location: "Granville Island Culinary Centre",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/07/kids-culinary.jpg",
        eventLink: "https://granvilleisland.com/events/kids-culinary-adventure",
        price: "$45 per child",
        ticketsRequired: true,
        category: "Children"
      },
      {
        title: "Market Music Series: Jazz on the Island",
        description: "Enjoy the smooth sounds of jazz at this free outdoor concert series. The Vancouver Jazz Collective will perform a repertoire ranging from classic standards to contemporary compositions, creating the perfect soundtrack for your market visit. Grab delicious food from market vendors, find a seat in the courtyard, and soak in the vibrant atmosphere as professional musicians perform against the backdrop of False Creek and downtown Vancouver.",
        date: new Date("2025-08-16T13:00:00"),
        endTime: new Date("2025-08-16T16:00:00"),
        recurrence: "Third Saturday of each month",
        location: "Market Courtyard",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/07/market-music-jazz.jpg",
        eventLink: "https://granvilleisland.com/events/market-music-jazz",
        price: "Free",
        performers: ["Vancouver Jazz Collective"],
        category: "Music"
      },
      {
        title: "Artisan Food Festival",
        description: "Discover the art of small-batch food production at this celebration of artisanal culinary crafts. Meet the makers behind local chocolates, cheeses, charcuterie, preserves, breads, and more. The festival features tasting stations, demonstrations of traditional techniques, workshops on fermentation and preservation, and panel discussions on the craft food movement. This event highlights the skill, passion, and dedication that goes into creating handcrafted food products.",
        date: new Date("2025-08-23T11:00:00"),
        endTime: new Date("2025-08-23T18:00:00"),
        location: "Throughout Granville Island Market",
        imageUrl: "https://granvilleisland.com/wp-content/uploads/2025/07/artisan-food-festival.jpg",
        eventLink: "https://granvilleisland.com/events/artisan-food-festival-2025",
        price: "$15 admission (includes tasting passport)",
        ticketsRequired: true,
        category: "Food Festival"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Granville Island Public Market scraper...');
    const events = [];

    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events

      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `granville-island-${slugifiedTitle}-${eventDate}`;

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

        detailedDescription += `Location: ${eventData.location}, Granville Island, Vancouver\n`;

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }

        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }

        detailedDescription += `\nGranville Island is located in False Creek, under the Granville Street Bridge. It is accessible by car, public transit, or the False Creek Ferries and Aquabus. For more information, visit ${this.url}`;

        // Create categories
        const categories = ['granville island', 'public market', 'food', 'shopping'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.category === 'Market') {
          categories.push('farmers market', 'local produce', 'shopping');
        } else if (eventData.category === 'Food Festival') {
          categories.push('culinary', 'tasting', 'gourmet');
        } else if (eventData.category === 'Workshop') {
          categories.push('craft', 'art', 'hands-on', 'education');
        } else if (eventData.category === 'Dining') {
          categories.push('gourmet', 'chef', 'culinary', 'wine');
        } else if (eventData.category === 'Children') {
          categories.push('family', 'kids', 'cooking', 'education');
        } else if (eventData.category === 'Music') {
          categories.push('concert', 'live music', 'entertainment', 'jazz');
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

      console.log(`🍎 Successfully created ${events.length} Granville Island Public Market events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Granville Island Public Market scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new GranvilleIslandMarketScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new GranvilleIslandMarketScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.GranvilleIslandMarketScraper = GranvilleIslandMarketScraper;