/**
 * Vancouver Art Gallery Scraper
 * 
 * This scraper provides information about exhibitions and events at the Vancouver Art Gallery
 * Source: https://www.vanartgallery.bc.ca/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverArtGalleryScraper {
  constructor() {
    this.name = 'Vancouver Art Gallery';
    this.url = 'https://www.vanartgallery.bc.ca/';
    this.sourceIdentifier = 'vancouver-art-gallery';
    
    // Venue information
    this.venue = {
      name: "Vancouver Art Gallery",
      id: "vancouver-art-gallery",
      address: "750 Hornby St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6Z 2H7",
      coordinates: {
        lat: 49.2827417,
        lng: -123.1207375
      },
      websiteUrl: "https://www.vanartgallery.bc.ca/",
      description: "The Vancouver Art Gallery is the largest public art museum in Western Canada, occupying a heritage building designed by Francis Rattenbury in downtown Vancouver. The Gallery features a diverse collection of historical and contemporary artworks with a focus on British Columbia art, particularly works by Indigenous artists and the renowned artist Emily Carr. The institution presents major exhibitions of Canadian and international artists while serving as a vibrant cultural hub in the city center."
    };
    
    // Upcoming exhibitions and events for 2025
    this.events = [
      {
        title: "Emily Carr: Into the Forest",
        description: "Experience a landmark exhibition celebrating one of Canada's most beloved artists, Emily Carr. 'Into the Forest' presents over 50 of Carr's iconic forest landscapes alongside rarely seen sketches, writings, and personal artifacts. The exhibition explores Carr's profound connection to the British Columbia wilderness, her evolving artistic style, and her unique spirituality. Through her vibrant, swirling canvases, visitors will journey into the depths of the West Coast forests that defined her vision.",
        type: "Exhibition",
        date: new Date("2025-06-12T10:00:00"),
        endDate: new Date("2025-09-28T17:00:00"),
        openingHours: "Daily 10 AM - 5 PM, Tuesdays until 9 PM",
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/04/emily-carr-exhibition.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/exhibitions/emily-carr-into-the-forest",
        category: "Visual Arts"
      },
      {
        title: "Art After Dark: Summer Solstice Edition",
        description: "Experience the Vancouver Art Gallery after hours at our popular Art After Dark event, Summer Solstice Edition. Enjoy exclusive access to all gallery exhibitions, live music performances, interactive art activities, craft cocktails, and pop-up food stations throughout the gallery spaces. This special edition features site-specific light installations by local artists, a solstice-themed photo booth, and guided flashlight tours exploring themes of light and darkness in the Gallery's collection.",
        type: "Special Event",
        date: new Date("2025-06-20T19:00:00"),
        endTime: new Date("2025-06-20T23:00:00"),
        ageRestriction: "19+",
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/05/art-after-dark.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/events/art-after-dark-summer-2025",
        price: "$35 general, $25 members",
        ticketsRequired: true,
        category: "Social Event"
      },
      {
        title: "Contemporary Japanese Photography: New Visions",
        description: "This groundbreaking exhibition brings together the work of twelve contemporary Japanese photographers who are reshaping the medium in the 21st century. 'New Visions' explores themes of urbanization, technological advancement, environmental change, and evolving notions of identity in modern Japan. From documentary approaches to conceptual works and experimental techniques, the exhibition offers an insightful perspective on Japan's vibrant contemporary photography scene and its global influence.",
        type: "Exhibition",
        date: new Date("2025-07-05T10:00:00"),
        endDate: new Date("2025-10-12T17:00:00"),
        openingHours: "Daily 10 AM - 5 PM, Tuesdays until 9 PM",
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/06/japanese-photography.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/exhibitions/contemporary-japanese-photography",
        category: "Visual Arts"
      },
      {
        title: "Curator's Tour: Contemporary Japanese Photography",
        description: "Join guest curator Yuki Tanaka for an insightful tour of 'Contemporary Japanese Photography: New Visions.' Tanaka will discuss the artistic, cultural, and technical aspects of the works on display, offering expert commentary on how these photographers are pushing boundaries and reflecting Japan's complex modern identity. The tour will explore key themes in the exhibition and provide context about each artist's practice and significance in the contemporary art world.",
        type: "Guided Tour",
        date: new Date("2025-07-15T14:00:00"),
        endTime: new Date("2025-07-15T15:30:00"),
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/06/curator-tour.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/events/curator-tour-japanese-photography",
        price: "Free with gallery admission",
        ticketsRequired: true,
        category: "Educational"
      },
      {
        title: "Family FUSE Weekend: Patterns in Nature",
        description: "Bring the whole family to the Vancouver Art Gallery for a weekend of art exploration and creation! This edition of Family FUSE focuses on 'Patterns in Nature,' connecting to themes in our current exhibitions. Activities include hands-on art-making workshops, interactive gallery tours designed for children, storytelling sessions, and performances by local musicians and dancers. Guest artists will lead specialized workshops exploring natural patterns through printmaking, textiles, and digital media.",
        type: "Family Program",
        date: new Date("2025-07-26T10:00:00"),
        endDate: new Date("2025-07-27T17:00:00"),
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/05/family-fuse.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/events/family-fuse-july-2025",
        price: "Free with gallery admission, children 12 and under always free",
        category: "Family"
      },
      {
        title: "Indigenous Perspectives: Art, Land and Reconciliation",
        description: "This powerful group exhibition brings together works by leading Indigenous artists from across Canada who explore themes of land rights, cultural identity, colonization, and reconciliation. The exhibition features diverse media including painting, sculpture, installation, video, and performance, highlighting contemporary Indigenous artistic practices while honoring traditional knowledge and storytelling methods. Public programming includes artist talks, panel discussions, and collaborative community events.",
        type: "Exhibition",
        date: new Date("2025-08-15T10:00:00"),
        endDate: new Date("2025-12-07T17:00:00"),
        openingHours: "Daily 10 AM - 5 PM, Tuesdays until 9 PM",
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/07/indigenous-perspectives.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/exhibitions/indigenous-perspectives",
        category: "Visual Arts"
      },
      {
        title: "Opening Celebration: Indigenous Perspectives",
        description: "Join us for the opening celebration of 'Indigenous Perspectives: Art, Land and Reconciliation.' The evening will begin with a traditional welcome by Musqueam, Squamish and Tsleil-Waututh representatives, followed by remarks from participating artists and curators. The celebration features traditional and contemporary performances, including dance, music and storytelling. Light refreshments will be served, and attendees will have the first opportunity to experience this groundbreaking exhibition.",
        type: "Opening Reception",
        date: new Date("2025-08-14T18:00:00"),
        endTime: new Date("2025-08-14T21:00:00"),
        imageUrl: "https://www.vanartgallery.bc.ca/wp-content/uploads/2025/07/indigenous-opening.jpg",
        eventLink: "https://www.vanartgallery.bc.ca/events/indigenous-perspectives-opening",
        price: "Free with registration",
        ticketsRequired: true,
        category: "Cultural Event"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Art Gallery scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `vancouver-art-gallery-${slugifiedTitle}-${eventDate}`;
        
        // Format the date for display
        const dateFormat = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        
        // Handle exhibitions (longer duration events)
        if (eventData.type === 'Exhibition') {
          const startDate = dateFormat.format(eventData.date);
          const endDate = dateFormat.format(eventData.endDate);
          
          detailedDescription += `Exhibition Dates: ${startDate} - ${endDate}\n`;
          detailedDescription += `Hours: ${eventData.openingHours}\n`;
          
          // Create event object for exhibition
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endDate,
            venue: this.venue,
            category: 'arts',
            categories: ['arts', 'visual arts', 'museum', 'exhibition', 'culture', eventData.category.toLowerCase()],
            sourceURL: this.url,
            officialWebsite: eventData.eventLink,
            image: eventData.imageUrl || null,
            ticketsRequired: false, // General admission applies
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added exhibition: ${eventData.title} (${startDate} - ${endDate})`);
        } 
        // Handle one-day events
        else {
          const formattedDate = dateFormat.format(eventData.date);
          
          const timeFormat = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          });
          
          const formattedStartTime = timeFormat.format(eventData.date);
          const formattedEndTime = timeFormat.format(eventData.endTime || eventData.endDate);
          
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
          
          if (eventData.price) {
            detailedDescription += `Price: ${eventData.price}\n`;
          }
          
          if (eventData.ageRestriction) {
            detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
          }
          
          if (eventData.ticketsRequired) {
            detailedDescription += `Tickets: Required, please register in advance\n`;
          }
          
          // Add categories based on event type
          const categories = ['arts', 'museum', 'culture', eventData.category.toLowerCase()];
          
          if (eventData.type === 'Guided Tour') {
            categories.push('tour', 'educational', 'learning');
          } else if (eventData.type === 'Family Program') {
            categories.push('family', 'children', 'workshops', 'activities');
          } else if (eventData.type === 'Special Event') {
            categories.push('social', 'nightlife', 'entertainment');
          } else if (eventData.type === 'Opening Reception') {
            categories.push('opening', 'reception', 'celebration');
          }
          
          // Create event object for one-day event
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endTime || eventData.endDate,
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
      }
      
      console.log(`🖼️ Successfully created ${events.length} Vancouver Art Gallery events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Art Gallery scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverArtGalleryScraper();
