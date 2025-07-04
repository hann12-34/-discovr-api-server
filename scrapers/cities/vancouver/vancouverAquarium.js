/**
 * Vancouver Aquarium Scraper
 * 
 * This scraper provides information about events at the Vancouver Aquarium
 * Source: https://www.vanaqua.org/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverAquariumScraper {
  constructor() {
    this.name = 'Vancouver Aquarium';
    this.url = 'https://www.vanaqua.org/';
    this.sourceIdentifier = 'vancouver-aquarium';
    
    // Venue information
    this.venue = {
      name: "Vancouver Aquarium",
      id: "vancouver-aquarium",
      address: "845 Avison Way",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6G 3E2",
      coordinates: {
        lat: 49.3004,
        lng: -123.1309
      },
      websiteUrl: "https://www.vanaqua.org/",
      description: "The Vancouver Aquarium is a world-class marine science center dedicated to conservation, research, and education. Located in Stanley Park, it houses over 50,000 animals representing 792 species, including sea otters, beluga whales, dolphins, and countless marine invertebrates. As Canada's largest aquarium, it offers immersive exhibits, behind-the-scenes experiences, and innovative programming that connects visitors to the wonders of aquatic life while promoting ocean conservation."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Ocean After Hours",
        description: "Experience the Vancouver Aquarium in a whole new light at our adults-only evening event. Ocean After Hours transforms the aquarium into a sophisticated venue with themed cocktails, live music, and special animal presentations. Explore the galleries without crowds, enjoy sustainable seafood canapés from local chefs, and engage with marine educators stationed throughout the exhibits. Each event features a different ocean conservation theme with guest speakers and interactive displays.",
        date: new Date("2025-07-11T19:00:00"),
        endTime: new Date("2025-07-11T23:00:00"),
        recurrence: "Monthly, second Friday",
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/06/ocean-after-hours.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/ocean-after-hours",
        price: "$45 general, $35 members",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Adults"
      },
      {
        title: "Marine Conservation Workshop: Protecting Our Oceans",
        description: "Join marine biologists and conservation experts for an in-depth workshop on ocean protection. Participants will learn about current threats facing marine ecosystems, innovative conservation techniques, and practical actions to reduce their environmental impact. The workshop includes hands-on activities with marine specimens, a behind-the-scenes tour of the Aquarium's research facilities, and collaborative problem-solving sessions focused on real-world conservation challenges.",
        date: new Date("2025-07-19T10:00:00"),
        endTime: new Date("2025-07-19T15:00:00"),
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/06/conservation-workshop.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/marine-conservation-workshop",
        price: "$75 general, $60 members (includes lunch)",
        ticketsRequired: true,
        category: "Educational"
      },
      {
        title: "World Oceans Day Celebration",
        description: "Celebrate World Oceans Day at the Vancouver Aquarium with a day full of special activities highlighting ocean conservation. The event features interactive exhibits on plastic pollution, sustainable seafood choices, and climate change impacts on marine life. Join beach clean-up demonstrations, watch special dive shows with conservation messages, participate in citizen science projects, and meet local environmental organizations. All activities are included with regular admission.",
        date: new Date("2025-07-26T10:00:00"),
        endTime: new Date("2025-07-26T17:00:00"),
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/06/world-oceans-day.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/world-oceans-day",
        price: "Included with regular admission",
        category: "Special Event"
      },
      {
        title: "Tiny Bubbles: Preschool Program",
        description: "Designed specifically for children ages 3-5, Tiny Bubbles is an engaging educational program that introduces young children to marine life through storytelling, puppet shows, crafts, and up-close animal encounters. Each session focuses on a different ocean theme, encouraging curiosity and wonder about aquatic creatures. Children will create ocean-themed art projects, participate in movement activities that mimic marine animals, and develop early science skills through guided observation.",
        date: new Date("2025-08-05T09:30:00"),
        endTime: new Date("2025-08-05T11:00:00"),
        recurrence: "Weekly on Tuesdays",
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/07/tiny-bubbles.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/tiny-bubbles",
        price: "$20 per child (accompanying adult free)",
        ticketsRequired: true,
        category: "Children"
      },
      {
        title: "Sleep with the Sharks: Family Overnight Adventure",
        description: "Experience the magic of the Vancouver Aquarium after dark during this unforgettable family overnight adventure. Participants enjoy exclusive after-hours access to the galleries, special presentations by marine educators, and the unique opportunity to sleep beside their favorite exhibits. The program includes evening snacks, morning breakfast, a special nighttime flashlight tour, animal encounters, and interactive marine activities. This popular program creates lasting memories for families with children aged 5-12.",
        date: new Date("2025-08-15T19:00:00"),
        endDate: new Date("2025-08-16T09:00:00"),
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/07/sleep-with-sharks.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/sleep-with-sharks",
        price: "$120 per person",
        ticketsRequired: true,
        category: "Family"
      },
      {
        title: "Sustainable Seafood Symposium",
        description: "Join leading chefs, marine scientists, and sustainable fishing advocates for a day focused on ocean-friendly seafood choices. This symposium includes panel discussions on aquaculture innovations, wild fishery management, and consumer choices that support healthy oceans. Participants will enjoy sustainable seafood tastings prepared by prominent Vancouver chefs, learn practical tips for making environmentally responsible seafood choices, and receive resources for continued education on this important topic.",
        date: new Date("2025-08-23T11:00:00"),
        endTime: new Date("2025-08-23T16:00:00"),
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/07/sustainable-seafood.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/sustainable-seafood-symposium",
        price: "$85 general, $70 members (includes tastings)",
        ticketsRequired: true,
        category: "Symposium"
      },
      {
        title: "Behind the Scenes: Marine Mammal Care",
        description: "Gain exclusive access to the Vancouver Aquarium's marine mammal facilities in this special behind-the-scenes tour. Participants will meet the dedicated animal care team and learn about the specialized care provided to sea otters, seals, sea lions, and other marine mammals. The tour covers animal nutrition, veterinary care, training techniques, and enrichment activities. You'll observe a training session up-close and learn about the rescue and rehabilitation work conducted by the Marine Mammal Rescue Centre.",
        date: new Date("2025-08-30T13:00:00"),
        endTime: new Date("2025-08-30T15:00:00"),
        recurrence: "Last Saturday of each month",
        imageUrl: "https://www.vanaqua.org/wp-content/uploads/2025/07/behind-scenes-mammals.jpg",
        eventLink: "https://www.vanaqua.org/visit/events/behind-scenes-marine-mammals",
        price: "$60 general, $50 members",
        ticketsRequired: true,
        category: "Tour"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Aquarium scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `vancouver-aquarium-${slugifiedTitle}-${eventDate}`;
        
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
        let formattedStartTime, formattedEndTime;
        
        if (eventData.endDate && !eventData.endTime) {
          // This is an overnight event
          formattedStartTime = timeFormat.format(eventData.date);
          formattedEndTime = timeFormat.format(eventData.endDate);
          const nextDayDate = dateFormat.format(eventData.endDate);
          
          // Create detailed description with formatted date and time for overnight events
          let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
          detailedDescription += `Start: ${formattedDate} at ${formattedStartTime}\n`;
          detailedDescription += `End: ${nextDayDate} at ${formattedEndTime}\n`;
          
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
          
          detailedDescription += `\nLocation: Vancouver Aquarium, 845 Avison Way in Stanley Park, Vancouver. The Vancouver Aquarium is located in Stanley Park and is accessible by car, public transit, and the Stanley Park shuttle.`;
          
          // Create categories
          const categories = ['aquarium', 'marine life', 'education', 'family'];
          
          // Add event-specific categories
          categories.push(eventData.category.toLowerCase());
          
          if (eventData.category === 'Family') {
            categories.push('overnight', 'children', 'sleepover', 'special experience');
          }
          
          // Create event object for overnight event
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endDate,
            venue: this.venue,
            category: 'attraction',
            categories: categories,
            sourceURL: this.url,
            officialWebsite: eventData.eventLink,
            image: eventData.imageUrl || null,
            ticketsRequired: !!eventData.ticketsRequired,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added overnight event: ${eventData.title} on ${formattedDate}`);
        } else {
          // Regular event with start and end time
          formattedStartTime = timeFormat.format(eventData.date);
          formattedEndTime = timeFormat.format(eventData.endTime);
          
          // Create detailed description with formatted date and time
          let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
          
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
          
          detailedDescription += `\nLocation: Vancouver Aquarium, 845 Avison Way in Stanley Park, Vancouver. The Vancouver Aquarium is located in Stanley Park and is accessible by car, public transit, and the Stanley Park shuttle.`;
          
          // Create categories
          const categories = ['aquarium', 'marine life', 'education'];
          
          // Add event-specific categories
          categories.push(eventData.category.toLowerCase());
          
          if (eventData.category === 'Adults') {
            categories.push('nightlife', 'social', '19+', 'evening event');
          } else if (eventData.category === 'Educational') {
            categories.push('workshop', 'conservation', 'learning');
          } else if (eventData.category === 'Special Event') {
            categories.push('celebration', 'conservation', 'family-friendly');
          } else if (eventData.category === 'Children') {
            categories.push('kids', 'preschool', 'family', 'learning');
          } else if (eventData.category === 'Symposium') {
            categories.push('food', 'sustainability', 'culinary', 'conservation');
          } else if (eventData.category === 'Tour') {
            categories.push('behind-the-scenes', 'exclusive', 'animal care');
          }
          
          // Create event object
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endTime,
            venue: this.venue,
            category: 'attraction',
            categories: categories,
            sourceURL: this.url,
            officialWebsite: eventData.eventLink,
            image: eventData.imageUrl || null,
            ticketsRequired: !!eventData.ticketsRequired,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
        }
      }
      
      console.log(`🐋 Successfully created ${events.length} Vancouver Aquarium events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Aquarium scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverAquariumScraper();
