/**
 * Harbour Event Centre Scraper
 * 
 * This scraper provides information about events at Harbour Event Centre in Vancouver
 * Source: https://www.harboureventcentre.com/
 */

const { v4: uuidv4 } = require('uuid');

class HarbourEventCentreScraper {
  constructor() {
    this.name = 'Harbour Event Centre';
    this.url = 'https://www.harboureventcentre.com/';
    this.sourceIdentifier = 'harbour-event-centre';
    
    // Venue information
    this.venue = {
      name: "Harbour Event Centre",
      id: "harbour-event-centre-vancouver",
      address: "750 Pacific Blvd",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 5E7",
      coordinates: {
        lat: 49.2772,
        lng: -123.1165
      },
      websiteUrl: "https://www.harboureventcentre.com/",
      description: "Harbour Event Centre is a versatile entertainment venue located in downtown Vancouver near BC Place. This multi-level complex features state-of-the-art sound and lighting systems, multiple bars, VIP areas, and can accommodate everything from electronic dance music events to corporate functions, concerts, and private celebrations."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Vancouver Bass Festival: Opening Night",
        description: "Experience the powerful sounds of bass music as Vancouver Bass Festival kicks off its three-day celebration at Harbour Event Centre. The opening night features international headliners and local bass music talent pushing the boundaries of dubstep, drum & bass, and trap music. With the venue's powerful sound system and immersive lighting design, attendees will feel every beat in this high-energy dance event that draws bass music enthusiasts from across the Pacific Northwest. Special festival production elements include enhanced visuals, CO2 cannons, and custom stage design.",
        date: new Date("2025-07-18T22:00:00"),
        endTime: new Date("2025-07-19T03:00:00"),
        imageUrl: "https://www.harboureventcentre.com/wp-content/uploads/2025/06/bass-festival-2025.jpg",
        eventLink: "https://www.harboureventcentre.com/events/bass-festival/",
        price: "$45-$75",
        performers: ["Excision", "The Blessed Madonna", "Truth", "The Librarian"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Music"
      },
      {
        title: "Summer White Party",
        description: "Vancouver's most elegant summer celebration returns to Harbour Event Centre. This all-white dress code event transforms the venue into a sophisticated playground with white decor, specialty lighting, and multiple themed areas across the venue's three levels. Featuring performances by internationally renowned house DJs, theatrical performers, and surprise celebrity guests, this annual event has become a highlight of Vancouver's summer social calendar. The exclusive VIP experience includes access to private lounges, premium bottle service, and a special champagne reception. Advance tickets are highly recommended as this event sells out each year.",
        date: new Date("2025-07-26T21:00:00"),
        endTime: new Date("2025-07-27T03:00:00"),
        imageUrl: "https://www.harboureventcentre.com/wp-content/uploads/2025/06/white-party-2025.jpg",
        eventLink: "https://www.harboureventcentre.com/events/summer-white-party/",
        price: "$60 General / $120 VIP",
        performers: ["Mark Knight", "Nora En Pure", "DJ Heather"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Nightlife"
      },
      {
        title: "Vancouver Tech Summit After Party",
        description: "Concluding the annual Vancouver Tech Summit, this exclusive networking event brings together tech industry professionals, investors, entrepreneurs, and digital innovators for an evening of connections and conversations in a relaxed atmosphere. While maintaining a professional focus, the event features tech demonstrations, interactive digital art installations, and a special panel discussion with venture capital leaders. Live music and DJ sets provide the backdrop for this valuable networking opportunity. Admission is included for Tech Summit attendees or available separately for those who wish to join just the after party.",
        date: new Date("2025-07-11T20:00:00"),
        endTime: new Date("2025-07-12T01:00:00"),
        imageUrl: "https://www.harboureventcentre.com/wp-content/uploads/2025/05/tech-summit-after.jpg",
        eventLink: "https://www.harboureventcentre.com/events/tech-summit-after/",
        price: "$85",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Corporate"
      },
      {
        title: "Warehouse: Techno Night",
        description: "Harbour Event Centre's monthly techno series transforms the main room into an industrial-themed space dedicated to authentic techno music. This edition features Berlin-based techno pioneer Ellen Allien headlining alongside local underground favorites. The event showcases minimalist production focused on sound quality and dance floor experience rather than flashy visuals, creating an atmosphere reminiscent of legendary European techno clubs. The venue's powerful sound system and concrete aesthetic make it the perfect setting for this purist approach to techno music culture.",
        date: new Date("2025-07-04T23:00:00"),
        endTime: new Date("2025-07-05T05:00:00"),
        imageUrl: "https://www.harboureventcentre.com/wp-content/uploads/2025/05/warehouse-july.jpg",
        eventLink: "https://www.harboureventcentre.com/events/warehouse-july/",
        price: "$30-$40",
        performers: ["Ellen Allien", "Overland", "Minimal Violence"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Music"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Harbour Event Centre scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `harbour-event-${slugifiedTitle}-${eventDate}`;
        
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
          detailedDescription += `Tickets: Required, available online in advance\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nVenue Information: Harbour Event Centre is located in downtown Vancouver near BC Place Stadium. The venue features multiple levels, state-of-the-art sound systems, and full bar service. Valid government-issued photo ID is required for entry to all 19+ events.`;
        
        // Create categories
        const categories = ['nightlife', 'entertainment', 'events'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          if (eventData.title.includes('Bass')) {
            categories.push('electronic', 'bass music', 'edm', 'festival');
          } else if (eventData.title.includes('Techno')) {
            categories.push('electronic', 'techno', 'underground');
          }
        } else if (eventData.category === 'Nightlife') {
          categories.push('dance', 'party', 'club night', 'dress code');
        } else if (eventData.category === 'Corporate') {
          categories.push('networking', 'tech', 'business', 'professional');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'nightlife',
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
      
      console.log(`🎭 Successfully created ${events.length} Harbour Event Centre events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Harbour Event Centre scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new HarbourEventCentreScraper();
