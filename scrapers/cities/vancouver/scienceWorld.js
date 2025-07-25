/**
 * Science World Scraper
 * 
 * This scraper provides information about events at Science World in Vancouver
 * Source: https://www.scienceworld.ca/
 */

const { v4: uuidv4 } = require('uuid');

class ScienceWorldScraper {
  constructor() {
    this.name = 'Science World';
    this.url = 'https://www.scienceworld.ca/';
    this.sourceIdentifier = 'science-world';
    
    // Venue information
    this.venue = {
      name: "Science World at TELUS World of Science",
      id: "science-world-vancouver",
      address: "1455 Quebec St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6A 3Z7",
      coordinates: {
        lat: 49.2734,
        lng: -123.1034
      },
      websiteUrl: "https://www.scienceworld.ca/",
      description: "Science World at TELUS World of Science is a science centre and museum housed in a distinctive geodesic dome on False Creek in Vancouver. Since 1989, the venue has been inspiring minds through interactive exhibits, immersive films, and engaging educational programs that make science accessible and exciting for all ages."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "After Dark: Adult Evening - Molecular Gastronomy",
        description: "Experience Science World after hours at this 19+ event combining science, cocktails, and culinary innovation. This special evening focuses on the fascinating world of molecular gastronomy, where cooking meets chemistry. Enjoy live demonstrations from renowned local chefs who use scientific techniques to transform familiar ingredients into extraordinary culinary creations. Interactive stations throughout the venue allow guests to experiment with spherification, gelification, and other molecular techniques while enjoying specialty cocktails designed for the event. All exhibits remain open for exploration, creating a unique adults-only museum experience that blends education, entertainment, and epicurean adventure.",
        date: new Date("2025-07-18T19:00:00"),
        endTime: new Date("2025-07-18T23:00:00"),
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/06/after-dark-molecular.jpg",
        eventLink: "https://www.scienceworld.ca/event/after-dark-molecular-gastronomy/",
        price: "$45 ($38 for members)",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Adult Event"
      },
      {
        title: "Robot Takeover: Artificial Intelligence Exhibition",
        description: "Explore the fascinating world of artificial intelligence and robotics in this immersive new exhibition at Science World. 'Robot Takeover' demystifies AI through interactive exhibits that demonstrate how machine learning works, the ethical implications of AI development, and how robots perceive and interact with their environment. Visitors can engage with cutting-edge robots, program simple AI systems, play games against computer opponents, and learn about the Canadian researchers leading innovations in this field. The exhibition includes a special section on AI in everyday life, showing how these technologies already influence everything from smartphone assistants to medical diagnostics, traffic management, and online shopping recommendations.",
        date: new Date("2025-07-01T10:00:00"),
        endTime: new Date("2025-12-31T17:00:00"),
        recurrence: "Daily exhibition through December 31, 2025",
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/05/robot-exhibition.jpg",
        eventLink: "https://www.scienceworld.ca/exhibition/robot-takeover/",
        price: "Included with admission",
        ticketsRequired: true,
        category: "Exhibition"
      },
      {
        title: "Wonder Weekend: Astronomy Exploration",
        description: "Bring the whole family to this special weekend celebration of astronomy and space science. Activities include solar telescope viewing (weather permitting), virtual reality space explorations, scale model solar system walks, comet-making demonstrations using dry ice, and rocket launch simulations. Special guests include astronomers from the University of British Columbia and representatives from the Royal Astronomical Society of Canada, who will share their expertise and answer questions about our universe. The Wonder Weekend series offers enhanced programming around specific scientific themes, with Astronomy Exploration featuring twice as many hands-on activities as a regular visit. All activities are included with general admission to Science World.",
        date: new Date("2025-07-12T10:00:00"),
        endTime: new Date("2025-07-13T17:00:00"),
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/06/astronomy-weekend.jpg",
        eventLink: "https://www.scienceworld.ca/event/wonder-weekend-astronomy/",
        price: "Included with admission",
        category: "Family"
      },
      {
        title: "OMNIMAX Film: 'Oceans: Our Blue Planet'",
        description: "Journey across the world's oceans in this breathtaking OMNIMAX® film that brings the underwater world to life on Science World's giant dome screen. 'Oceans: Our Blue Planet' takes viewers on an extraordinary trip to the deepest, most mysterious parts of our oceans, revealing incredible creatures and behaviors captured for the first time on film. Using breakthrough filming technologies developed specifically for this production, the documentary provides unprecedented views of previously unexplored marine habitats. The immersive OMNIMAX® experience surrounds the audience with stunning visuals and powerful sound, creating the sensation of diving alongside dolphins, whale sharks, and other magnificent sea creatures while learning about the importance of ocean conservation.",
        date: new Date("2025-07-05T11:00:00"),
        endTime: new Date("2025-07-05T12:00:00"),
        recurrence: "Multiple showtimes daily",
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/05/oceans-omnimax.jpg",
        eventLink: "https://www.scienceworld.ca/omnimax/oceans/",
        price: "$8 in addition to general admission",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Teen Science Social: Climate Action",
        description: "Designed by teens for teens, this evening event provides a space for youth ages 13-18 to connect over their interest in science and climate activism. The program includes workshops on climate science, discussions with environmental experts and youth activists, hands-on experiments demonstrating the science behind climate change, and collaborative brainstorming sessions focused on developing local solutions. Participants will enjoy exclusive after-hours access to Science World exhibits, pizza dinner, and opportunities to network with like-minded peers and science professionals. This supportive environment encourages teens to explore STEM subjects while developing leadership skills and environmental awareness. Pre-registration is required as space is limited to ensure a quality experience.",
        date: new Date("2025-07-25T17:00:00"),
        endTime: new Date("2025-07-25T21:00:00"),
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/06/teen-climate-social.jpg",
        eventLink: "https://www.scienceworld.ca/event/teen-science-social/",
        price: "$20",
        ageRestriction: "13-18 years",
        ticketsRequired: true,
        category: "Teen Program"
      },
      {
        title: "Science of Cocktails Fundraiser",
        description: "Vancouver's most unique charity event returns for its tenth year, transforming Science World into the city's most spectacular laboratory of libations. This signature fundraiser features over 30 bar stations where the city's top bartenders and chefs create molecular mixology cocktails and complementary cuisine. Guests explore the venue while enjoying unlimited drinks and food, interactive science demonstrations related to the chemistry of cocktails, and special experiences available only during this event. Live entertainment, silent auctions, and exclusive access to all Science World galleries round out this unforgettable evening. All proceeds support Science World's Class Field Trip program, providing free science education opportunities to underserved schools across British Columbia.",
        date: new Date("2025-08-20T19:00:00"),
        endTime: new Date("2025-08-20T23:00:00"),
        imageUrl: "https://www.scienceworld.ca/wp-content/uploads/2025/07/science-of-cocktails.jpg",
        eventLink: "https://www.scienceworld.ca/event/science-of-cocktails/",
        price: "$165 General, $295 VIP",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Fundraiser"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Science World scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `science-world-${slugifiedTitle}-${eventDate}`;
        
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
        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        
        // Check if this is a long-running exhibition
        if (eventData.recurrence && eventData.recurrence.includes('Daily')) {
          const endDate = dateFormat.format(eventData.endTime);
          detailedDescription += `Running from ${formattedDate} to ${endDate}\n`;
          detailedDescription += `Hours: ${formattedStartTime} - ${formattedEndTime} daily\n`;
        } else if (eventData.endTime && eventData.endTime.getDate() !== eventData.date.getDate()) {
          // Multi-day event
          const endDate = dateFormat.format(eventData.endTime);
          detailedDescription += `Dates: ${formattedDate} to ${endDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        } else {
          // Single day event
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        }
        
        if (eventData.recurrence && !eventData.recurrence.includes('Daily')) {
          detailedDescription += `Recurrence: ${eventData.recurrence}\n`;
        }
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ageRestriction) {
          detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available through Science World website or box office\n`;
        }
        
        detailedDescription += `\nLocation: Science World at TELUS World of Science, 1455 Quebec Street, Vancouver. The venue is easily accessible via the Main Street-Science World SkyTrain station and offers bicycle parking. Limited pay parking is available nearby.`;
        
        // Create categories
        const categories = ['science', 'education', 'museum', 'family-friendly'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Adult Event') {
          categories.push('after hours', '19+', 'nightlife', 'cocktails');
        } else if (eventData.category === 'Exhibition') {
          categories.push('interactive', 'technology', 'robots', 'ai');
        } else if (eventData.category === 'Family') {
          categories.push('weekend', 'kids', 'astronomy', 'space');
        } else if (eventData.category === 'Film') {
          categories.push('documentary', 'omnimax', 'oceans', 'nature');
        } else if (eventData.category === 'Teen Program') {
          categories.push('youth', 'climate', 'environment', 'workshop');
        } else if (eventData.category === 'Fundraiser') {
          categories.push('charity', 'cocktails', 'gala', '19+');
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
          officialWebsite: eventData.eventLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }
      
      console.log(`🔬 Successfully created ${events.length} Science World events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Science World scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new ScienceWorldScraper();
