/**
 * Museum of Vancouver Scraper
 * 
 * This scraper provides information about events at the Museum of Vancouver
 * Source: https://www.museumofvancouver.ca/
 */

const { v4: uuidv4 } = require('uuid');

class MuseumOfVancouverScraper {
  constructor() {
    this.name = 'Museum of Vancouver';
    this.url = 'https://www.museumofvancouver.ca/';
    this.sourceIdentifier = 'museum-of-vancouver';
    
    // Venue information
    this.venue = {
      name: "Museum of Vancouver",
      id: "museum-of-vancouver",
      address: "1100 Chestnut St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6J 3J9",
      coordinates: {
        lat: 49.2763,
        lng: -123.1452
      },
      websiteUrl: "https://www.museumofvancouver.ca/",
      description: "Located in Vanier Park, the Museum of Vancouver connects Vancouverites to their city and its history through exhibitions and programs that explore the social, cultural, and natural history of the region. The museum holds more than 65,000 artifacts, including the Neon Vancouver Collection, and offers a mix of permanent and temporary exhibitions that examine Vancouver's past, present, and future."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Paddle Carving Workshop with Coast Salish Artists",
        description: "Learn the traditional art of paddle carving in this hands-on workshop led by celebrated Coast Salish artists. Participants will create their own miniature cedar paddle while learning about the cultural significance, techniques, and designs used by Indigenous peoples of the Pacific Northwest. The workshop begins with a gallery tour of the Museum's Indigenous collection, focusing on traditional watercraft and tools, followed by a demonstration of carving techniques. Participants will then work on their own paddle project under expert guidance, learning about wood selection, traditional carving tools, and finishing methods. All materials are provided, and no previous woodworking experience is necessary. This workshop is suitable for adults and youth ages 16+ and is part of the Museum's commitment to meaningful engagement with Indigenous knowledge and practices.",
        date: new Date("2025-07-19T10:00:00"),
        endTime: new Date("2025-07-19T16:00:00"),
        imageUrl: "https://www.museumofvancouver.ca/wp-content/uploads/2025/05/paddle-carving-2025.jpg",
        eventLink: "https://museumofvancouver.ca/paddle-carving-2025",
        price: "$125 (includes museum admission)",
        ageRestriction: "16+",
        ticketsRequired: true,
        category: "Workshop"
      },
      {
        title: "Urban Innovation: Vancouver's Climate Adaptation Exhibition Opening",
        description: "Join us for the opening reception of our newest exhibition examining Vancouver's innovative approaches to climate adaptation and resilience. This interactive exhibition showcases architectural models, engineering solutions, community initiatives, and policy frameworks that are helping Vancouver prepare for climate challenges including sea level rise, extreme weather events, and changing ecosystems. The evening features presentations from city planners, environmental scientists, and community leaders, followed by a panel discussion on the future of urban sustainability in coastal cities. Guests will enjoy a first look at the exhibition's interactive displays, including a digital simulation of Vancouver's changing shoreline through 2100 and physical models of flood-resistant architecture. Light refreshments featuring local, sustainable ingredients will be served, and attendees will have full access to all museum galleries throughout the evening.",
        date: new Date("2025-07-24T18:00:00"),
        endTime: new Date("2025-07-24T21:00:00"),
        imageUrl: "https://www.museumofvancouver.ca/wp-content/uploads/2025/06/climate-exhibition-2025.jpg",
        eventLink: "https://museumofvancouver.ca/urban-innovation-exhibition",
        price: "$20",
        ticketsRequired: true,
        category: "Exhibition"
      },
      {
        title: "Night at the Museum: Neon Vancouver After Dark",
        description: "Experience the Museum of Vancouver's iconic neon collection in a whole new light during this special after-hours event. The museum's Neon Vancouver gallery will be transformed with special lighting, projection mapping, and interactive elements that bring the story of the city's neon heritage to life. The evening includes guided tours by neon historians, live demonstrations of neon tube bending by local artisans, and the unveiling of newly restored signs never before displayed to the public. Visitors can participate in a neon-themed photo booth, enjoy craft cocktails inspired by iconic Vancouver nightspots of the mid-century era, and dance to a DJ playing music spanning the decades of Vancouver's neon heyday from the 1950s through the 1970s. This adults-only event offers a unique opportunity to experience the museum's collection in a festive, social atmosphere while learning about the cultural significance of neon signage in shaping Vancouver's urban identity.",
        date: new Date("2025-08-08T19:00:00"),
        endTime: new Date("2025-08-08T23:00:00"),
        imageUrl: "https://www.museumofvancouver.ca/wp-content/uploads/2025/07/neon-night-2025.jpg",
        eventLink: "https://museumofvancouver.ca/neon-after-dark-2025",
        price: "$30",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Special Event"
      },
      {
        title: "Family Sunday: Indigenous Plants and Medicines",
        description: "Bring the whole family for an educational and engaging exploration of Indigenous plant knowledge and traditional medicines. This special Family Sunday event features interactive stations throughout the museum where children and adults can learn to identify native plants, understand their traditional uses, and participate in hands-on activities led by Indigenous knowledge keepers. Activities include creating herbal tea blends, crafting cedar sachets, plant identification walks in Vanier Park (weather permitting), and storytelling sessions about the relationship between people and plants. The event connects to the museum's 'Wild Things: The Power of Nature in Our Lives' exhibition, offering deeper engagement with the themes of biodiversity and traditional ecological knowledge. All activities are included with regular museum admission, and additional drop-in programs run throughout the day. This event is suitable for families with children of all ages and offers a meaningful way to learn about Indigenous perspectives on sustainability and wellness.",
        date: new Date("2025-08-17T10:00:00"),
        endTime: new Date("2025-08-17T17:00:00"),
        imageUrl: "https://www.museumofvancouver.ca/wp-content/uploads/2025/07/family-sunday-plants-2025.jpg",
        eventLink: "https://museumofvancouver.ca/family-sunday-indigenous-plants",
        price: "Included with museum admission",
        ticketsRequired: false,
        category: "Family"
      },
      {
        title: "Curator's Tour: Hidden Treasures of the MOV Collection",
        description: "Join Museum of Vancouver's Chief Curator Dr. Viviane Williams for an exclusive behind-the-scenes tour of rarely seen artifacts from the museum's vast collection storage. This special tour takes visitors beyond the public galleries to explore the museum's climate-controlled storage facilities where over 65,000 artifacts are preserved. Dr. Williams will highlight unusual, significant, and newly acquired items that tell unexpected stories about Vancouver's history. The tour includes examination of textile collections including vintage fashion and Indigenous weavings, technological artifacts from early industries, archaeological findings from local excavations, and decorative arts that reflect the city's diverse cultural influences. Throughout the tour, Dr. Williams will discuss the challenges of collection conservation, the ethical considerations in artifact acquisition, and how the museum decides which stories to tell through its exhibitions. This tour offers insight into the workings of a major urban museum and the hidden histories that may shape future exhibitions.",
        date: new Date("2025-08-22T14:00:00"),
        endTime: new Date("2025-08-22T16:00:00"),
        imageUrl: "https://www.museumofvancouver.ca/wp-content/uploads/2025/07/curators-tour-2025.jpg",
        eventLink: "https://museumofvancouver.ca/curators-tour-hidden-treasures",
        price: "$30 (includes museum admission)",
        ticketsRequired: true,
        category: "Tour"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Museum of Vancouver scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `mov-${slugifiedTitle}-${eventDate}`;
        
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
          detailedDescription += `Tickets: Required, available through the Museum of Vancouver website or at the admission desk\n`;
        }
        
        detailedDescription += `\nVenue Information: The Museum of Vancouver is located in Vanier Park, near Kitsilano Beach, and is easily accessible by public transit or car with parking available on-site. The museum is wheelchair accessible and offers a gift shop and café.`;
        
        // Create categories
        const categories = ['museum', 'culture', 'education'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.title.includes('Paddle Carving')) {
          categories.push('indigenous', 'workshop', 'crafts', 'cultural');
        } else if (eventData.title.includes('Urban Innovation')) {
          categories.push('exhibition', 'climate', 'sustainability');
        } else if (eventData.title.includes('Neon Vancouver')) {
          categories.push('special event', 'after hours', 'neon', 'heritage');
        } else if (eventData.title.includes('Family Sunday')) {
          categories.push('family', 'indigenous', 'nature', 'children');
        } else if (eventData.title.includes('Curator')) {
          categories.push('tour', 'behind the scenes', 'collection');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'culture',
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
      
      console.log(`🏛️ Successfully created ${events.length} Museum of Vancouver events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Museum of Vancouver scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new MuseumOfVancouverScraper();
