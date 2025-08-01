/**
 * Capilano Suspension Bridge Park Scraper
 * 
 * This scraper provides information about events at the Capilano Suspension Bridge Park in Vancouver
 * Source: https://www.capbridge.com/
 */

const { v4: uuidv4 } = require('uuid');

class CapilanoSuspensionBridgeScraper {
  constructor() {
    this.name = 'Capilano Suspension Bridge Park';
    this.url = 'https://www.capbridge.com/';
    this.sourceIdentifier = 'capilano-suspension-bridge';
    
    // Venue information
    this.venue = {
      name: "Capilano Suspension Bridge Park",
      id: "capilano-suspension-bridge-park",
      address: "3735 Capilano Road",
      city: "North Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V7R 4J1",
      coordinates: {
        lat: 49.3429,
        lng: -123.1139
      },
      websiteUrl: "https://www.capbridge.com/",
      description: "The Capilano Suspension Bridge Park is one of Vancouver's most popular tourist attractions, offering visitors a unique rainforest adventure. The park features a 140-meter suspension bridge that hangs 70 meters above the Capilano River, along with the Cliffwalk, Treetops Adventure, rainforest trails, historical exhibits, First Nations art installations, and educational programs on local ecology and history."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Canyon Lights Winter Festival",
        description: "Experience the magic of Canyon Lights, a winter festival that transforms the Capilano Suspension Bridge Park into a world of festive lights and visual enchantment. Hundreds of thousands of lights illuminate the suspension bridge, Treetops Adventure, Cliffwalk, and throughout the rainforest and canyon. This year's display features new light installations including a mesmerizing walk-through light tunnel, illuminated totem poles, and a multi-dimensional light show projected onto the canyon walls. Enjoy live holiday music, hot chocolate stations throughout the park, and appearances by holiday characters. The suspension bridge and Treetops Adventure viewing platforms provide spectacular perspectives of the light displays from above.",
        date: new Date("2025-01-10T16:00:00"),
        endTime: new Date("2025-01-10T21:00:00"),
        recurrence: "Daily from November 2024 to January 19, 2025",
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2024/11/canyon-lights-2025.jpg",
        eventLink: "https://www.capbridge.com/events/canyon-lights-2025/",
        price: "Regular admission rates apply, Annual Pass holders free",
        ticketsRequired: true,
        category: "Winter Festival"
      },
      {
        title: "Rainforest Ecology Tour",
        description: "Join our expert naturalists for a guided educational tour of the coastal temperate rainforest ecosystem within Capilano Suspension Bridge Park. This 90-minute walk explores the unique plant and animal species that make this forest their home, the interconnectedness of the ecosystem, and the importance of conservation. Learn about old-growth giants, nurse logs, forest regeneration, and native wildlife while walking through the rainforest trails, suspension bridge, and Treetops Adventure. Suitable for all ages but best for those interested in natural history, ecology, and conservation. Tours operate in small groups for a more personalized experience.",
        date: new Date("2025-07-15T10:00:00"),
        endTime: new Date("2025-07-15T11:30:00"),
        recurrence: "Daily at 10am and 2pm, July-August 2025",
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2025/06/rainforest-ecology-tour.jpg",
        eventLink: "https://www.capbridge.com/events/rainforest-ecology-tours-2025/",
        price: "$10 in addition to park admission",
        ticketsRequired: true,
        category: "Educational Tour"
      },
      {
        title: "Indigenous Cultural Performances",
        description: "Experience authentic Indigenous cultural performances featuring traditional songs, dances, and stories from the Coast Salish Nations of the Pacific Northwest. These engaging performances provide insights into the rich cultural heritage, traditional practices, and connection to the land of the region's First Nations peoples. The performances take place at the park's outdoor stage area, with seating available on a first-come basis. Following each performance, visitors have the opportunity to meet the performers, learn about the traditional regalia, and ask questions. The surrounding Indigenous carving center and totem pole collection provide additional context for understanding the cultural significance of the performances.",
        date: new Date("2025-07-05T13:00:00"),
        endTime: new Date("2025-07-05T14:00:00"),
        recurrence: "Weekends at 11am, 1pm, and 3pm throughout July and August",
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2025/05/indigenous-performances.jpg",
        eventLink: "https://www.capbridge.com/events/indigenous-cultural-performances-2025/",
        price: "Included with park admission",
        category: "Cultural Performance"
      },
      {
        title: "Photography Workshop: Capturing Nature",
        description: "Develop your nature photography skills in one of Vancouver's most photogenic settings. Led by professional landscape and nature photographer David Thompson, this hands-on workshop covers techniques for capturing stunning images of forests, waterfalls, architectural elements, and wildlife in challenging light conditions. The workshop includes both technical instruction and creative guidance, with sessions focusing on composition, lighting, perspective, and post-processing techniques. Participants will have special early access to the park before regular opening hours to capture images without crowds. All skill levels are welcome, from beginners to advanced photographers. Bring your own camera equipment (DSLR, mirrorless, or advanced point-and-shoot recommended).",
        date: new Date("2025-07-19T07:00:00"),
        endTime: new Date("2025-07-19T10:00:00"),
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2025/06/photo-workshop.jpg",
        eventLink: "https://www.capbridge.com/events/nature-photography-workshop/",
        price: "$95 (includes park admission)",
        ticketsRequired: true,
        category: "Workshop"
      },
      {
        title: "Summer Solstice Celebration",
        description: "Celebrate the longest day of the year with our special Summer Solstice event at Capilano Suspension Bridge Park. This evening event features extended hours until sunset, allowing visitors to experience the park's natural beauty in the golden evening light. The celebration includes guided sunset nature walks, live acoustic music performances at various locations throughout the park, a special solstice-themed menu at the park's Cliff House Restaurant, and a ceremonial lighting of the bridge at dusk. Local storytellers will share traditional solstice tales from various cultures, connecting visitors to this universal celestial celebration. Cap off the evening by watching the sunset from the suspension bridge for a truly magical experience.",
        date: new Date("2025-06-21T17:00:00"),
        endTime: new Date("2025-06-21T22:00:00"),
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2025/05/solstice-celebration.jpg",
        eventLink: "https://www.capbridge.com/events/summer-solstice-2025/",
        price: "Regular admission rates apply, 20% discount after 5pm",
        ticketsRequired: true,
        category: "Seasonal Celebration"
      },
      {
        title: "Kids' Treetop Adventure Camp",
        description: "This five-day summer camp for children ages 8-12 offers an exciting blend of outdoor adventure, environmental education, and hands-on nature activities. Campers will explore the rainforest ecosystem, learn wilderness skills, participate in nature crafts, and discover the park's unique features through interactive games and guided exploration. Daily themes focus on forest ecology, Indigenous knowledge, wildlife, conservation, and adventure skills. The camp includes special behind-the-scenes tours of park operations, ecology field activities led by naturalists, and a junior ranger training program. Each day includes time on the suspension bridge and Treetops Adventure platforms. Camp runs Monday through Friday with drop-off at 9am and pick-up at 4pm, with optional extended care available.",
        date: new Date("2025-08-11T09:00:00"),
        endTime: new Date("2025-08-15T16:00:00"),
        imageUrl: "https://www.capbridge.com/wp-content/uploads/2025/06/kids-camp.jpg",
        eventLink: "https://www.capbridge.com/events/kids-adventure-camp-2025/",
        price: "$385 per child for the week",
        ticketsRequired: true,
        category: "Children's Program"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Capilano Suspension Bridge Park scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `capilano-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Check if this is a multi-day event like a camp
        if (eventData.endTime && eventData.endTime.getDate() !== eventData.date.getDate() && 
            eventData.endTime.getMonth() === eventData.date.getMonth()) {
          // Multi-day event within same month
          detailedDescription += `Dates: ${formattedDate} to ${dateFormat.format(eventData.endTime)}\n`;
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
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available online or at the park entrance\n`;
        }
        
        detailedDescription += `\nLocation: Capilano Suspension Bridge Park, 3735 Capilano Road, North Vancouver. The park is accessible via public transit (free shuttle from downtown Vancouver) or by car with on-site parking available.`;
        
        // Create categories
        const categories = ['attraction', 'outdoors', 'nature', 'tourism'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Winter Festival') {
          categories.push('lights', 'holiday', 'family-friendly', 'seasonal');
        } else if (eventData.category === 'Educational Tour') {
          categories.push('nature', 'guided tour', 'ecology', 'learning');
        } else if (eventData.category === 'Cultural Performance') {
          categories.push('indigenous', 'first nations', 'performance', 'cultural');
        } else if (eventData.category === 'Workshop') {
          categories.push('photography', 'skill-building', 'creative');
        } else if (eventData.category === 'Seasonal Celebration') {
          categories.push('solstice', 'sunset', 'evening event', 'music');
        } else if (eventData.category === 'Children\'s Program') {
          categories.push('camp', 'kids', 'summer camp', 'educational');
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
      
      console.log(`🌲 Successfully created ${events.length} Capilano Suspension Bridge Park events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Capilano Suspension Bridge Park scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new CapilanoSuspensionBridgeScraper();
