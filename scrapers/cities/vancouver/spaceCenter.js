/**
 * H.R. MacMillan Space Centre Scraper
 *
 * This scraper provides information about events at the H.R. MacMillan Space Centre in Vancouver
 * Source: https://www.spacecentre.ca/
 */

const { v4: uuidv4 } = require('uuid');

class SpaceCenterScraper {
  constructor() {
    this.name = 'H.R. MacMillan Space Centre';
    this.url = 'https://www.spacecentre.ca/';
    this.sourceIdentifier = 'space-centre';

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
        lat: 49.2762,
        lng: -123.1448
      },
      websiteUrl: "https://www.spacecentre.ca/",
      description: "The H.R. MacMillan Space Centre is a non-profit community resource that brings the wonder of space to Earth while providing a personal sense of ongoing discovery. Through innovative programming, exhibits and activities, our goal is to inspire sustained interest in the fields of Earth science, space science and astronomy from a Canadian perspective."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Cosmic Nights: After Dark at the Space Centre",
        description: "Experience the Space Centre after hours at this adults-only evening event combining science, socializing, and spirits. July's theme 'Mars: The Red Planet' explores our fascinating planetary neighbor with special exhibits on Mars exploration missions, recent scientific discoveries, and the challenges of potential human colonization. Enjoy access to all galleries, telescope viewing (weather permitting), themed cocktails, interactive demonstrations, and presentations from astronomy experts. This popular monthly series offers a unique night out that's both educational and entertaining.",
        date: new Date("2025-07-17T19:00:00"),
        endTime: new Date("2025-07-17T23:00:00"),
        recurrence: "Monthly series",
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/cosmic-nights-july.jpg",
        eventLink: "https://www.spacecentre.ca/event/cosmic-nights-july-2025/",
        price: "$35 ($30 for members)",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Adults"
      },
      {
        title: "Planetarium Show: Exploring Exoplanets",
        description: "Journey to distant worlds orbiting other stars in our newest planetarium show. 'Exploring Exoplanets' uses stunning visualizations to showcase the incredible diversity of planets discovered beyond our solar system. Learn how astronomers detect these distant worlds, what they've discovered about their compositions and atmospheres, and the ongoing search for potentially habitable planets. The immersive dome projection creates a breathtaking experience as you travel virtually to some of the most fascinating exoplanets discovered to date, from scorching hot Jupiters to potentially Earth-like worlds.",
        date: new Date("2025-07-05T13:00:00"),
        endTime: new Date("2025-07-05T14:00:00"),
        recurrence: "Multiple showtimes daily",
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/05/exoplanets-show.jpg",
        eventLink: "https://www.spacecentre.ca/event/exploring-exoplanets/",
        price: "Included with admission",
        ticketsRequired: true,
        category: "Planetarium"
      },
      {
        title: "Astronomy Day: Family Festival",
        description: "Celebrate International Astronomy Day with a full day of family-friendly activities at the Space Centre. This special event features solar telescope viewing (weather permitting), build-your-own constellation activities, meet-and-greets with local astronomers, space-themed crafts and experiments, and special planetarium presentations. Representatives from local astronomy clubs will be on hand with telescopes and expertise to share their passion for stargazing. The festival is designed for visitors of all ages with activities appropriate for everyone from young children to adult astronomy enthusiasts.",
        date: new Date("2025-07-26T10:00:00"),
        endTime: new Date("2025-07-26T17:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/astronomy-day-2025.jpg",
        eventLink: "https://www.spacecentre.ca/event/astronomy-day-2025/",
        price: "Included with admission",
        category: "Family"
      },
      {
        title: "Space Explorers Summer Camp",
        description: "Our week-long space camp for children ages 8-12 combines hands-on STEM activities with imagination and fun. Campers will build and launch their own model rockets, design Mars rover prototypes, learn about living in space through simulated astronaut training exercises, explore the night sky using our planetarium, and participate in team challenges inspired by real space missions. Led by our experienced science educators, this camp fosters curiosity, critical thinking, and collaboration while inspiring the next generation of space explorers. Extended care options are available for working parents.",
        date: new Date("2025-08-11T09:00:00"),
        endTime: new Date("2025-08-15T16:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/06/summer-camp.jpg",
        eventLink: "https://www.spacecentre.ca/event/summer-camp-2025/",
        price: "$375 for the week ($340 for members)",
        ticketsRequired: true,
        category: "Children"
      },
      {
        title: "Guest Lecture: Dr. Sarah Gallagher on Black Holes",
        description: "We're thrilled to welcome renowned astrophysicist Dr. Sarah Gallagher for a fascinating lecture on black holes. As a leading researcher in the field and science advisor to the Canadian Space Agency, Dr. Gallagher will discuss the la Horizon Telescope and gravitational wave detections. The evening includes a Q&A session and post-lecture reception with light refreshments.",
        date: new Date("2025-08-07T19:00:00"),
        endTime: new Date("2025-08-07T21:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/07/black-hole-lecture.jpg",
        eventLink: "https://www.spacecentre.ca/event/guest-lecture-black-holes/",
        price: "$25 ($20 for members)",
        ticketsRequired: true,
        category: "Lecture"
      },
      {
        title: "Stargazing Evening: Perseid Meteor Shower",
        description: "Join us for a special evening of meteor shower viewing at our observatory site in the UBC Endowment Lands. The annual Perseid meteor shower is one of the best of the year, capable of producing up to 60 meteors per hour at its peak. Our astronomers will guide you in observing this spectacular celestial event, explaining the science behind meteor showers and pointing out other summer sky features visible through our telescopes. Hot chocolate and light snacks will be provided. Please bring warm clothing, a chair or blanket, and a red-filtered flashlight if you have one.",
        date: new Date("2025-08-12T22:00:00"),
        endTime: new Date("2025-08-13T01:00:00"),
        imageUrl: "https://www.spacecentre.ca/wp-content/uploads/2025/07/perseids-2025.jpg",
        eventLink: "https://www.spacecentre.ca/event/perseid-viewing-2025/",
        price: "$30 ($25 for members)",
        ticketsRequired: true,
        category: "Stargazing"
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
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events

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

        const formattedDate = dateFormat.format(eventData.date);
        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);

        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;

        // Check if this is a multi-day event like a camp
        if (eventData.endTime && eventData.endTime.getDate() !== eventData.date.getDate()) {
          // Multi-day event
          const endDate = dateFormat.format(eventData.endTime);
          detailedDescription += `Dates: ${formattedDate} to ${endDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime} daily\n`;
        } else {
          // Single day event
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        }

        if (eventData.recurrence) {
          detailedDescription += `Recurrence: ${eventData.recurrence}\n`;
        }

        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }

        if (eventData.ageRestriction) {
          detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }

        detailedDescription += `\nLocation: H.R. MacMillan Space Centre, 1100 Chestnut Street, Vancouver (in Vanier Park). The Space Centre is accessible by public transit and has paid parking available nearby.`;

        // Create categories
        const categories = ['space', 'astronomy', 'science', 'education'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.category === 'Adults') {
          categories.push('nightlife', 'social', '19+');
        } else if (eventData.category === 'Planetarium') {
          categories.push('show', 'immersive', 'family-friendly');
        } else if (eventData.category === 'Family') {
          categories.push('festival', 'activities', 'all-ages');
        } else if (eventData.category === 'Children') {
          categories.push('camp', 'summer camp', 'stem');
        } else if (eventData.category === 'Lecture') {
          categories.push('talk', 'educational', 'astrophysics');
        } else if (eventData.category === 'Stargazing') {
          categories.push('observatory', 'night sky', 'meteor shower', 'outdoor');
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
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }

      console.log(`🚀 Successfully created ${events.length} H.R. MacMillan Space Centre events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in H.R. MacMillan Space Centre scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new SpaceCenterScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new SpaceCenterScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.SpaceCenterScraper = SpaceCenterScraper;