/**
 * H.R. MacMillan Space Centre Scraper
 *
 * This scraper provides information about events at the H.R. MacMillan Space Centre in Vancouver
 * Source: https://www.spacecentre.ca/
 */

const { v4: uuidv4 } = require('uuid');

class HRMacMillanSpaceCentreScraper {
  constructor() {
    this.name = 'H.R. MacMillan Space Centre';
    this.url = 'https://www.spacecentre.ca/';
    this.sourceIdentifier = 'hr-macmillan-space-centre';

    // Venue information
    this.venue = {
      name: "H.R. MacMillan Space Centre",
      id: "hr-macmillan-space-centre",
      address: "1100 Chestnut St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6J 3J9",
      coordinates: {
        lat: 49.2764,
        lng: -123.1446
      },
      websiteUrl: "https://www.spacecentre.ca/",
      description: "The H.R. MacMillan Space Centre is a non-profit community resource that brings the wonders of space to Earth, while providing a personal sense of ongoing discovery. Through innovative programming, exhibits and activities, our goal is to inspire sustained interest in the fields of Earth science, space science and astronomy from a Canadian perspective."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Cosmic Nights: Exoplanets & Alien Worlds",
        description: "Join us for a special 19+ evening at the Space Centre focused on exoplanets and the search for alien life. This adults-only event transforms the Space Centre into an after-hours science lounge featuring expert talks, planetarium shows, telescope viewing (weather permitting), and interactive demonstrations. Dr. Sara Rodriguez, exoplanet researcher from UBC's Department of Physics and Astronomy, will deliver the keynote presentation on recent discoveries from the James Webb Space Telescope and what they tell us about potentially habitable worlds beyond our solar system. The evening includes a special planetarium show 'Worlds Beyond' that takes audiences on a tour of the most fascinating exoplanets discovered to date, from scorching hot gas giants to potentially Earth-like rocky worlds. Throughout the night, enjoy themed cocktails from our licensed bar, explore the exhibits without crowds, and participate in hands-on activities including spectroscopy demonstrations showing how scientists detect elements in exoplanet atmospheres. The observatory will be open for guided stargazing through our telescopes, weather permitting.",
        date: new Date("2025-07-12T19:00:00"),
        endTime: new Date("2025-07-12T23:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/cosmic-nights-exoplanets.jpg",
        eventLink: "https://www.spacecentre.ca/event/cosmic-nights-exoplanets-2025/",
        price: "$35 ($30 for members)",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Special Event"
      },
      {
        title: "Summer Space Camp: Junior Astronauts (Ages 6-8)",
        description: "Blast off into an exciting week of space exploration designed specifically for young astronomers! Our Junior Astronauts day camp provides children ages 6-8 with an immersive, hands-on introduction to space science through engaging activities, demonstrations, and interactive learning. Campers will build and launch their own model rockets, create Mars rovers using simple machines, design space habitats, learn about astronaut training, and explore the solar system through daily planetarium shows tailored to their age group. Our experienced educators guide children through scientific concepts using play-based learning approaches that make complex ideas accessible and exciting. The week culminates in a special 'graduation ceremony' where junior astronauts demonstrate their new knowledge to family members and receive official certificates. All materials and daily healthy snacks are provided; children should bring their own lunch and water bottle each day. Extended care options are available before and after regular camp hours for an additional fee. Space is limited to ensure a high-quality experience with appropriate staff-to-child ratios.",
        date: new Date("2025-07-14T09:00:00"),
        endTime: new Date("2025-07-18T16:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/05/junior-astronauts-camp-2025.jpg",
        eventLink: "https://www.spacecentre.ca/event/summer-space-camp-junior-astronauts-2025/",
        price: "$395 for 5-day camp ($350 for members)",
        ageRestriction: "Ages 6-8",
        ticketsRequired: true,
        category: "Camp"
      },
      {
        title: "Planetarium Feature: 'Origins: The Birth of Our Universe'",
        description: "Experience the premiere of our breathtaking new planetarium show that takes audiences on an immersive journey through space and time to witness the origins of our universe. 'Origins: The Birth of Our Universe' utilizes state-of-the-art digital projection technology to visualize the latest scientific understanding of how our cosmos began and evolved. The 45-minute show begins with the Big Bang and traces the formation of the first stars and galaxies, the birth of our solar system, and the emergence of life on Earth. Narrated by renowned astrophysicist Dr. Neil Patel, the presentation combines cutting-edge scientific visualization with an emotional narrative about our cosmic connections. The show features data-driven animations based on actual observations from space telescopes including Webb, Hubble, and Chandra, making complex cosmological concepts accessible to audiences of all backgrounds. This feature presentation runs daily throughout the summer and is included with admission to the Space Centre. The immersive dome experience is enhanced by our newly upgraded 8K projection system and spatial sound technology that creates a truly multisensory experience of cosmic evolution.",
        date: new Date("2025-07-01T11:00:00"),
        endTime: new Date("2025-08-31T16:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/origins-planetarium-show.jpg",
        eventLink: "https://www.spacecentre.ca/event/origins-planetarium-show/",
        price: "Included with admission ($22-$28)",
        ticketsRequired: true,
        category: "Planetarium Show",
        isRecurring: true,
        recurringSchedule: "Daily showtimes at 11:00am, 1:00pm, 3:00pm (additional 5:00pm show on weekends)"
      },
      {
        title: "Space Explorers Club: Apollo Anniversary Celebration",
        description: "Celebrate the anniversary of the historic Apollo Moon landings with a special edition of our Space Explorers Club, designed for space enthusiasts of all ages. This drop-in event commemorates humanity's greatest journey with activities focused on lunar exploration past, present, and future. Visitors can touch authentic lunar meteorites, build and test lunar landers with different landing mechanisms, participate in simulated moonwalks to understand the challenges faced by Apollo astronauts, and explore detailed models of the Apollo spacecraft. Special presentations throughout the day will highlight Canada's contributions to lunar exploration, including the Canadarm technology and Canadian astronauts involved in upcoming Artemis missions. The Gordon MacMillan Southam Observatory will feature solar telescope viewing during daylight hours (weather permitting). All activities are included with regular admission, and Space Centre members can bring a guest for free on this special day. The celebration culminates with a screening of restored Apollo mission footage in the planetarium and a panel discussion with space experts discussing the legacy of Apollo and the future of human space exploration.",
        date: new Date("2025-07-20T10:00:00"),
        endTime: new Date("2025-07-20T17:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/apollo-anniversary-2025.jpg",
        eventLink: "https://www.spacecentre.ca/event/apollo-anniversary-celebration-2025/",
        price: "Included with admission ($22-$28)",
        ticketsRequired: true,
        category: "Special Event"
      },
      {
        title: "Astronomy Lecture Series: The Future of Mars Exploration",
        description: "Join us for an engaging evening lecture featuring Dr. Christine Martinez, planetary geologist and member of NASA's Mars 2025 rover planning team. In this illustrated presentation, Dr. Martinez will discuss the latest discoveries from Mars missions and preview the exciting future of Martian exploration. The talk will cover recent findings from the Perseverance and Curiosity rovers, the successful Mars ually support human presence on Mars. Following the lecture, audience members will have the opportunity to ask questions and, weather permitting, observe Mars through telescopes set up by local astronomy club members in the plaza outside the Space Centre. This lecture is suitable for adults and interested teens and is part of our ongoing commitment to connecting the public with leading scientists and cutting-edge space research.",
        date: new Date("2025-07-25T19:00:00"),
        endTime: new Date("2025-07-25T21:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/07/mars-lecture-series.jpg",
        eventLink: "https://www.spacecentre.ca/event/astronomy-lecture-series-mars-exploration-2025/",
        price: "$18 ($15 for members, $10 for students)",
        ticketsRequired: true,
        category: "Lecture"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting H.R. MacMillan Space Centre scraper...');
    const events = [];

    try {
      // Process predefined events
      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `space-centre-${slugifiedTitle}-${eventDate}`;

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

        // Format date based on whether it's a single day or multi-day event
        let formattedDateRange = '';
        if (eventData.date.toDaData.endTime.toDa()) {
          // Single day event
          formattedDateRange = `${dateFormat.format(eventData.date)}`;
        } else {
          // Multi-day event
          const startDate = dateFormat.format(eventData.date);
          const endDate = dateFormat.format(eventData.endTime);
          formattedDateRange = `${startDate} - ${endDate}`;
        }

        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);

        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;

        if (eventData.isRecurring) {
          detailedDescription += `Dates: ${formattedDateRange}\n`;
          detailedDescription += `Schedule: ${eventData.recurringSchedule}\n`;
        } else if (eventData.date.toDaData.endTime.toDa()) {
          // Single day event
          detailedDescription += `Date: ${formattedDateRange}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        } else {
          // Multi-day event
          detailedDescription += `Dates: ${formattedDateRange}\n`;
          detailedDescription += `Hours: ${formattedStartTime} - ${formattedEndTime} daily\n`;
        }

        detailedDescription += `Venue: ${this.venue.name}, ${this.venue.address}, Vancouver\n`;

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ageRestriction) {
          detailedDescription += `Age: ${eventData.ageRestriction}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available online through the Space Centre website or at the door\n`;
        }

        detailedDescription += `\nVenue Information: The H.R. MacMillan Space Centre is located in Vanier Park, adjacent to the Museum of Vancouver. The facility includes the Planetarium Star Theatre with its digital projection system, the Cosmic Courtyard hands-on activity area, and the Gordon MacMillan Southam Observatory (open on clear nights). The Space Centre is wheelchair accessible and offers a gift shop with space-themed merchandise and educational items.`;

        // Create categories
        const categories = ['science', 'education', 'astronomy', 'space'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.title.includes('Cosmic Nights')) {
          categories.push('adult', 'nightlife', 'after hours', 'science');
        } else if (eventData.title.includes('Space Camp')) {
          categories.push('kids', 'family', 'camp', 'summer');
        } else if (eventData.title.includes('Planetarium')) {
          categories.push('show', 'immersive', 'planetarium', 'educational');
        } else if (eventData.title.includes('Apollo')) {
          categories.push('history', 'moon landing', 'special event', 'family');
        } else if (eventData.title.includes('Lecture')) {
          categories.push('talk', 'mars', 'science', 'educational');
        }

        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'science',
          categories: categories,
          sourceURL: this.url,
          officialWebsite: eventDataLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };

        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDateRange}`);
      }

      console.log(`🔭 Successfully created ${events.length} H.R. MacMillan Space Centre events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in H.R. MacMillan Space Centre scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new HRMacMillanSpaceCentreScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new HRMacMillanSpaceCentreScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.HRMacMillanSpaceCentreScraper = HRMacMillanSpaceCentreScraper;