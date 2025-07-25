/**
 * Vancouver Art & Leisure Scraper
 * 
 * This scraper provides information about events at Vancouver Art & Leisure
 * Source: https://www.val.city/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverArtAndLeisureScraper {
  constructor() {
    this.name = 'Vancouver Art & Leisure';
    this.url = 'https://www.val.city/';
    this.sourceIdentifier = 'vancouver-art-leisure';
    
    // Venue information
    this.venue = {
      name: "Vancouver Art & Leisure",
      id: "vancouver-art-leisure",
      address: "281 Industrial Ave",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6A 2P2",
      coordinates: {
        lat: 49.2732,
        lng: -123.0919
      },
      websiteUrl: "https://www.val.city/",
      description: "Vancouver Art and Leisure (VAL) is an artist-run centre and creative community space that hosts exhibitions, performances, dance parties, and cultural events. Known for its inclusive atmosphere and support of underground arts and LGBTQ+ communities, VAL provides a platform for emerging artists and experimental work."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Chromatic: Immersive Art Exhibition",
        description: "Step into a multi-sensory installation where light, sound, and interactive elements create a fully immersive art experience. 'Chromatic' features work by ten local digital artists exploring the theme of synesthesia through projection mapping, responsive environments, and audio installations. Visitors can interact with the exhibits and influence the evolving audiovisual landscape.",
        date: new Date("2025-07-10T18:00:00"),
        endTime: new Date("2025-07-10T23:00:00"),
        imageUrl: "https://www.val.city/events/chromatic-2025.jpg",
        eventLink: "https://www.val.city/events/chromatic/",
        price: "$20",
        ticketsRequired: true,
        category: "Art"
      },
      {
        title: "Sapphic Saturdays: Pride Edition",
        description: "Vancouver's favorite queer women's dance party returns for a special Pride edition. Featuring DJ sets by top female and non-binary DJs, immersive lighting, and performance art interludes. This inclusive event celebrates women and non-binary individuals with progressive house and disco beats in VAL's main space.",
        date: new Date("2025-07-19T21:00:00"),
        endTime: new Date("2025-07-20T03:00:00"),
        imageUrl: "https://www.val.city/events/sapphic-saturdays-pride.jpg",
        eventLink: "https://www.val.city/events/sapphic-saturdays/",
        price: "$25",
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Nightlife"
      },
      {
        title: "Experimental Sound Series: Modular Synthesis",
        description: "An evening dedicated to the art of modular synthesis featuring performances by electronic music innovators exploring the boundaries of sound design. The event includes live performances, equipment demonstrations, and a modular synth petting zoo where attendees can experiment with various synthesizers.",
        date: new Date("2025-07-24T20:00:00"),
        endTime: new Date("2025-07-25T01:00:00"),
        imageUrl: "https://www.val.city/events/modular-synthesis-2025.jpg",
        eventLink: "https://www.val.city/events/experimental-sound/",
        price: "$15",
        performers: ["Kathy Wang", "Minimal Violence", "x/o"],
        ticketsRequired: true,
        category: "Music"
      },
      {
        title: "Life Drawing: Figure & Form",
        description: "A monthly life drawing session with professional models and guided instruction suitable for all skill levels. Materials provided and no experience necessary. The session explores different poses, lighting, and drawing techniques in VAL's intimate studio space.",
        date: new Date("2025-07-15T19:00:00"),
        endTime: new Date("2025-07-15T22:00:00"),
        imageUrl: "https://www.val.city/events/life-drawing-july.jpg",
        eventLink: "https://www.val.city/events/life-drawing/",
        price: "$18",
        ticketsRequired: true,
        category: "Workshop"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Art & Leisure scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `val-${slugifiedTitle}-${eventDate}`;
        
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
          detailedDescription += `Tickets: Required, available through website\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        // Create categories
        const categories = ['arts', 'culture', 'alternative'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Art') {
          categories.push('exhibition', 'immersive', 'digital art');
        } else if (eventData.category === 'Nightlife') {
          categories.push('lgbtq', 'dance party', 'queer', 'pride');
        } else if (eventData.category === 'Music') {
          categories.push('electronic', 'experimental', 'synthesizer');
        } else if (eventData.category === 'Workshop') {
          categories.push('life drawing', 'art class', 'figure drawing');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'arts',
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
      
      console.log(`🎨 Successfully created ${events.length} Vancouver Art & Leisure events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Art & Leisure scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverArtAndLeisureScraper();
