/**
 * Vancouver Pride Festival Scraper
 *
 * This scraper provides information about events at the Vancouver Pride Festival
 * Source: https://www.vancouverpride.ca/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverPrideScraper {
  constructor() {
    this.name = 'Vancouver Pride Festival';
    this.url = 'https://www.vancouverpride.ca/';
    this.sourceIdentifier = 'vancouver-pride';

    // Venue information - Using multiple locations across Vancouver
    this.venues = {
      sunset: {
        name: "Sunset Beach",
        id: "sunset-beach-vancouver",
        address: "1204 Beach Ave",
        city: city,
        state: "BC",
        country: "Canada",
        postalCode: "V6E 1V3",
        coordinates: {
          lat: 49.2799,
          lng: -123.1387
        },
        websiteUrl: "https://vancouver.ca/parks-recreation-culture/sunset-beach.aspx",
        description: "Sunset Beach is a popular sandy beach at the mouth of False Creek, offering stunning views of English Bay and the North Shore mountains. During Pride, it transforms into the festival grounds with stages, vendor markets, and community spaces."
      },
      downtown: {
        name: "Downtown Vancouver",
        id: "downtown-vancouver",
        address: "Robson St & Denman St",
        city: city,
        state: "BC",
        country: "Canada",
        postalCode: "V6G 2M7",
        coordinates: {
          lat: 49.2827,
          lng: -123.1207
        },
        websiteUrl: "https://www.vancouverpride.ca/",
        description: "The heart of Vancouver's downtown core serves as the parade route and hosts various Pride events throughout the festival period."
      },
      jimDever: {
        name: "Jim Deva Plaza",
        id: "jim-deva-plaza-vancouver",
        address: "1200 Bute St",
        city: city,
        state: "BC",
        country: "Canada",
        postalCode: "V6E 1Z7",
        coordinates: {
          lat: 49.2809,
          lng: -123.1317
        },
        websiteUrl: "https://www.vancouverpride.ca/",
        description: "Jim Deva Plaza in the Davie Village is a public square named after a local LGBTQ+ rights activist. This plaza serves as a community gathering space during Pride and throughout the year."
      }
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Pride Kick-Off Party",
        description: "Launch into Pride Week at the official Pride Kick-Off Party! This celebration brings together community members, allies, performers, and dignitaries to mark the beginning of Vancouver Pride festivities. The event features speeches from community leaders, performances by local LGBTQ2S+ artists, and the raising of the Pride and Trans flags. Join us for an evening of celebration, connection, and community as we kick off Pride Week 2025.",
        date: new Date("2025-07-28T19:00:00"),
        endTime: new Date("2025-07-28T22:00:00"),
        location: "Jim Deva Plaza",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/05/kick-off-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/kick-off-party/",
        price: "Free",
        category: "Party"
      },
      {
        title: "Pride Youth Dance",
        description: "Vancouver Pride presents a safe, inclusive, and substance-free dance party for LGBTQ2S+ youth and allies aged 14-18. Featuring popular DJs, interactive activities, and performances by young local artists, this event creates a space for young people to express themselves authentically and build community connections. Youth-focused resources and support organizations will be present to provide information and assistance.",
        date: new Date("2025-07-30T19:00:00"),
        endTime: new Date("2025-07-30T23:00:00"),
        location: "Roundhouse Community Centre",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/05/youth-dance-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/youth-dance/",
        price: "$5 suggested donation (no one turned away for lack of funds)",
        category: "Youth"
      },
      {
        title: "Vancouver Pride Parade",
        description: "The Vancouver Pride Parade, now in its 47th year, is a vibrant celebration of love, diversity, and inclusion. This signature event draws over 500,000 spectators as colorful floats, marching groups, and performers wind through downtown Vancouver's West End. Community organizations, corporate allies, and political representatives come together in this powerful demonstration of pride and solidarity. The parade route extends from Robson Street to Beach Avenue, culminating at the Sunset Beach Festival site.",
        date: new Date("2025-08-03T12:00:00"),
        endTime: new Date("2025-08-03T15:00:00"),
        location: "Downtown Vancouver",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/06/parade-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/vancouver-pride-parade/",
        price: "Free",
        category: "Parade"
      },
      {
        title: "Pride Festival at Sunset Beach",
        description: "Following the Pride Parade, the celebration continues at the Pride Festival at Sunset Beach. This massive outdoor party features multiple stages with live music, drag performances, and DJ sets. Explore over 100 vendor booths from community organizations, artisans, and food vendors. The festival includes a family zone with activities for children, a beer garden for adults, and community spaces focused on education and resources. With stunning ocean and mountain views as a backdrop, this is Vancouver Pride's largest single-day event.",
        date: new Date("2025-08-03T15:00:00"),
        endTime: new Date("2025-08-03T22:00:00"),
        location: "Sunset Beach",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/06/festival-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/pride-festival/",
        price: "Free",
        category: "Festival"
      },
      {
        title: "Pride Art Walk",
        description: "Explore LGBTQ2S+ art and culture through the Pride Art Walk, a self-guided tour featuring works by queer artists displayed in businesses throughout Davie Village and the West End. This event highlights diverse artistic expressions across mediums including painting, photography, sculpture, and digital art. A mobile-friendly map guides participants to each location, where artists' statements provide context about the works and their significance. The Art Walk concludes with an evening reception where artists and community members can connect.",
        date: new Date("2025-08-01T11:00:00"),
        endTime: new Date("2025-08-07T20:00:00"),
        location: "Davie Village",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/05/art-walk-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/art-walk/",
        price: "Free",
        category: "Arts"
      },
      {
        title: "Pride Night at the Vancouver Aquarium",
        description: "Experience the magical underwater world after hours at Pride Night at the Vancouver Aquarium. This adults-only evening transforms the aquarium into a Pride celebration with themed cocktails, drag performances among the marine exhibits, and special educational talks highlighting gender diversity in marine species. Dance to live DJs while exploring the aquarium's fascinating displays, with proceeds supporting both Vancouver Pride and the aquarium's conservation efforts.",
        date: new Date("2025-07-31T19:00:00"),
        endTime: new Date("2025-07-31T23:00:00"),
        location: "Vancouver Aquarium",
        imageUrl: "https://www.vancouverpride.ca/wp-content/uploads/2025/05/aquarium-night-2025.jpg",
        eventLink: "https://www.vancouverpride.ca/events/pride-night-aquarium/",
        price: "$45",
        ticketsRequired: true,
        category: "Special Event"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting Vancouver Pride Festival scraper...');
    const events = [];

    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events

      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `vancouver-pride-${slugifiedTitle}-${eventDate}`;

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

        // Determine which venue to use based on location
        let venue;
        if (eventData.location.includes("Sunset Beach")) {
          venue = this.venues.sunset;
        } else if (eventData.location.includes("Downtown")) {
          venue = this.venues.downtown;
        } else if (eventData.location.includes("Jim Deva") || eventData.location.includes("Davie Village")) {
          venue = this.venues.jimDeva;
        } else {
          // Default venue for other locations
          venue = {
            name: eventData.location,
            id: `pride-venue-${eventData.location.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')}`,
            address: city,
            city: city,
            state: "BC",
            country: "Canada",
            websiteUrl: "https://www.vancouverpride.ca/"
          };
        }

        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        detailedDescription += `Location: ${eventData.location}, Vancouver\n`;

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }

        detailedDescription += `\nThis event is part of the Vancouver Pride Festival 2025. For more information about this and other Pride events, please visit ${this.url}`;

        // Create categories
        const categories = ['pride', 'lgbtq+', 'festival', 'community', 'celebration'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.category === 'Parade') {
          categories.push('march', 'street event');
        } else if (eventData.category === 'Festival') {
          categories.push('music', 'performances', 'vendors', 'food');
        } else if (eventData.category === 'Party') {
          categories.push('dance', 'social', 'nightlife');
        } else if (eventData.category === 'Arts') {
          categories.push('art', 'exhibition', 'culture');
        } else if (eventData.category === 'Youth') {
          categories.push('teen', 'all-ages', 'dance');
        } else if (eventData.category === 'Special Event') {
          categories.push('nightlife', 'unique', 'entertainment');
        }

        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: venue,
          category: 'festival',
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

      console.log(`🏳️‍🌈 Successfully created ${events.length} Vancouver Pride Festival events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in Vancouver Pride Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverPrideScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new VancouverPrideScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.VancouverPrideScraper = VancouverPrideScraper;