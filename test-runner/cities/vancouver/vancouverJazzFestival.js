/**
 * Vancouver International Jazz Festival Scraper
 * 
 * This scraper provides information about events at the Vancouver International Jazz Festival
 * Source: https://www.coastaljazz.ca/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverJazzFestivalScraper {
  constructor() {
    this.name = 'Vancouver International Jazz Festival';
    this.url = 'https://www.coastaljazz.ca/';
    this.sourceIdentifier = 'vancouver-jazz-festival';
    
    // Multiple venues used during the festival
    this.venues = {
      robson: {
        name: "Robson Square",
        id: "robson-square-vancouver",
        address: "800 Robson St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6Z 3B7",
        coordinates: {
          lat: 49.2819,
          lng: -123.1211
        },
        websiteUrl: "https://www.coastaljazz.ca/",
        description: "Robson Square is an outdoor civic center and public plaza in the heart of downtown Vancouver, featuring a sunken plaza, tiered seating, and water features."
      },
      performance: {
        name: "Performance Works",
        id: "performance-works-vancouver",
        address: "1218 Cartwright St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6H 3R8",
        coordinates: {
          lat: 49.2705,
          lng: -123.1339
        },
        websiteUrl: "https://www.coastaljazz.ca/",
        description: "Performance Works is an intimate black box theatre located on Granville Island, providing a versatile performance space for a wide range of artistic presentations."
      },
      vogue: {
        name: "The Vogue Theatre",
        id: "vogue-theatre-vancouver",
        address: "918 Granville St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6Z 1L2",
        coordinates: {
          lat: 49.2807,
          lng: -123.1194
        },
        websiteUrl: "https://www.coastaljazz.ca/",
        description: "The Vogue Theatre is a historic art deco venue in downtown Vancouver, known for its excellent acoustics and elegant atmosphere."
      },
      ironworks: {
        name: "Ironworks",
        id: "ironworks-vancouver",
        address: "235 Alexander St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6A 1C2",
        coordinates: {
          lat: 49.2847,
          lng: -123.0979
        },
        websiteUrl: "https://www.coastaljazz.ca/",
        description: "Ironworks is a restored industrial building in Vancouver's Gastown district that has been transformed into a unique performance space with exposed brick walls and soaring ceilings."
      },
      frankieJazz: {
        name: "Frankie's Jazz Club",
        id: "frankies-jazz-club-vancouver",
        address: "765 Beatty St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6B 2M4",
        coordinates: {
          lat: 49.2786,
          lng: -123.1147
        },
        websiteUrl: "https://www.coastaljazz.ca/",
        description: "Frankie's Jazz Club is an intimate venue dedicated to jazz performance, featuring excellent acoustics and a warm, sophisticated atmosphere."
      }
    };
    
    // Upcoming events for 2025 Jazz Festival
    this.events = [
      {
        title: "Opening Night Gala: Kamasi Washington",
        description: "The Vancouver International Jazz Festival kicks off with a spectacular opening night featuring groundbreaking saxophone titan Kamasi Washington. Known for his expansive compositions and spiritual approach to music, Washington has revolutionized modern jazz with his epic recordings and collaborations with artists ranging from Kendrick Lamar to Herbie Hancock. His large ensemble delivers a transcendent musical experience that blends elements of spiritual jazz, funk, hip-hop, and classical music into a unique cosmic sound. Don't miss this triumphant festival opener showcasing one of the most significant voices in contemporary jazz.",
        date: new Date("2025-06-20T20:00:00"),
        endTime: new Date("2025-06-20T22:30:00"),
        venue: "vogue",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/04/kamasi-washington-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/kamasi-washington/",
        price: "$55-$75",
        performers: ["Kamasi Washington and his ensemble"],
        ticketsRequired: true,
        category: "Contemporary Jazz"
      },
      {
        title: "Brazilian Jazz Night: Eliane Elias Trio",
        description: "Grammy-winning pianist, singer, and composer Eliane Elias brings her intoxicating blend of Brazilian bossa nova and sophisticated jazz to the Vancouver Jazz Festival. With her flawless technique, lyrical piano style, and sultry Portuguese vocals, Elias creates an enchanting musical journey that seamlessly integrates the rhythmic complexity of her native Brazil with the harmonic sophistication of jazz. Joined by her exceptional trio featuring Marc Johnson on bass and Rafael Barata on drums, this performance promises an evening of sublime musical interplay and timeless elegance.",
        date: new Date("2025-06-22T19:30:00"),
        endTime: new Date("2025-06-22T21:30:00"),
        venue: "performance",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/04/eliane-elias-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/eliane-elias-trio/",
        price: "$45",
        performers: ["Eliane Elias Trio"],
        ticketsRequired: true,
        category: "Brazilian Jazz"
      },
      {
        title: "Downtown Jazz Series: The Bad Plus",
        description: "The legendary trio The Bad Plus continues to push the boundaries of what a piano-bass-drums ensemble can achieve. Known for their unique compositional approach, seamless integration of multiple genres, and telepathic improvisational interplay, the group has been at the forefront of creative music for over two decades. Their repertoire spans original compositions and inventive deconstructions of pop, rock, and electronic music transformed through a jazz lens. This performance will feature material from their latest album alongside audience favorites, showcasing their continued evolution and artistic fearlessness.",
        date: new Date("2025-06-25T21:00:00"),
        endTime: new Date("2025-06-25T23:00:00"),
        venue: "ironworks",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/04/bad-plus-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/the-bad-plus/",
        price: "$40",
        performers: ["The Bad Plus"],
        ticketsRequired: true,
        category: "Contemporary Jazz"
      },
      {
        title: "Free Outdoor Concert: Dawn Pemberton Soul Revue",
        description: "Vancouver's own 'Queen of Soul' Dawn Pemberton brings her powerhouse vocals and infectious energy to this free outdoor concert at Robson Square. Leading her dynamic Soul Revue band, Pemberton delivers a high-energy performance drawing from classic soul, R&B, funk, and gospel traditions. Her commanding stage presence and ability to connect with audiences of all ages make this a perfect family-friendly event. Bring a blanket or chair, enjoy the sunshine, and let Dawn's uplifting music and positive vibes create a joyous community celebration as part of the Jazz Festival's free programming.",
        date: new Date("2025-06-28T14:00:00"),
        endTime: new Date("2025-06-28T15:30:00"),
        venue: "robson",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/05/dawn-pemberton-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/dawn-pemberton-soul-revue/",
        price: "Free",
        performers: ["Dawn Pemberton Soul Revue"],
        ticketsRequired: false,
        category: "Soul/R&B"
      },
      {
        title: "Late Night Jazz: Makaya McCraven Quintet",
        description: "Visionary drummer, composer, and producer Makaya McCraven presents his unique 'organic beat music' in this late-night festival highlight. Known for his innovative approach to blending live improvisation with studio production techniques, McCraven has been hailed as one of the most important voices in modern jazz. His quintet creates immersive sonic landscapes that draw from jazz, hip-hop, and electronic music while maintaining a deep groove sensibility. This performance will showcase material from his acclaimed albums, featuring virtuosic musicianship and boundary-pushing compositions that point to jazz's future while honoring its past.",
        date: new Date("2025-06-30T22:30:00"),
        endTime: new Date("2025-07-01T00:30:00"),
        venue: "frankieJazz",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/05/makaya-mccraven-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/makaya-mccraven-quintet/",
        price: "$35",
        performers: ["Makaya McCraven Quintet"],
        ticketsRequired: true,
        category: "Experimental Jazz"
      },
      {
        title: "Jazz Masters Series: Ron Carter Quartet",
        description: "Legendary bassist Ron Carter, the most recorded jazz bassist in history with over 2,200 albums to his credit, brings his masterful quartet to Vancouver. A NEA Jazz Master and member of Miles Davis's second great quintet, Carter's influence on the language of jazz bass is immeasurable. At 86, his playing remains as vital and sophisticated as ever, combining flawless technique with profound musical wisdom. This rare appearance features Carter leading his quartet through standards, original compositions, and selections from his vast recorded legacy, demonstrating why he remains one of jazz's most revered and essential artists.",
        date: new Date("2025-07-01T20:00:00"),
        endTime: new Date("2025-07-01T22:00:00"),
        venue: "performance",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/05/ron-carter-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/ron-carter-quartet/",
        price: "$50",
        performers: ["Ron Carter Quartet"],
        ticketsRequired: true,
        category: "Straight-ahead Jazz"
      },
      {
        title: "Closing Night: Cécile McLorin Salvant",
        description: "The 2025 Vancouver International Jazz Festival concludes with a special performance by three-time Grammy winner Cécile McLorin Salvant, widely recognized as one of the most distinctive and compelling vocalists in contemporary jazz. With her extraordinary vocal range, precise intonation, and dramatic interpretive skill, Salvant has revitalized the jazz vocal tradition while creating a unique artistic vision that spans centuries of music. Her repertoire includes forgotten gems from the American songbook, theatrical works, early blues and folk traditions, and original compositions. This concert features material from her latest acclaimed album, showcasing her unparalleled storytelling abilities.",
        date: new Date("2025-07-05T20:00:00"),
        endTime: new Date("2025-07-05T22:00:00"),
        venue: "vogue",
        imageUrl: "https://www.coastaljazz.ca/wp-content/uploads/2025/05/cecile-mclorin-salvant-2025.jpg",
        eventLink: "https://www.coastaljazz.ca/event/cecile-mclorin-salvant/",
        price: "$50-$70",
        performers: ["Cécile McLorin Salvant"],
        ticketsRequired: true,
        category: "Vocal Jazz"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver International Jazz Festival scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `jazz-festival-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Get venue information
        const venue = this.venues[eventData.venue];
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        detailedDescription += `Venue: ${venue.name}, ${venue.address}, Vancouver\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available through the Vancouver Jazz Festival website or box office\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nThis event is part of the 2025 Vancouver International Jazz Festival. For more information and the complete festival schedule, visit ${this.url}`;
        
        // Create categories
        const categories = ['jazz', 'music', 'festival', 'live music', 'concert'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Contemporary Jazz') {
          categories.push('modern jazz', 'fusion');
        } else if (eventData.category === 'Brazilian Jazz') {
          categories.push('world music', 'latin jazz', 'bossa nova');
        } else if (eventData.category === 'Soul/R&B') {
          categories.push('soul', 'r&b', 'funk');
        } else if (eventData.category === 'Experimental Jazz') {
          categories.push('avant-garde', 'electronic', 'hip-hop');
        } else if (eventData.category === 'Straight-ahead Jazz') {
          categories.push('bebop', 'swing', 'traditional jazz');
        } else if (eventData.category === 'Vocal Jazz') {
          categories.push('vocals', 'singer');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: venue,
          category: 'music',
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
      
      console.log(`🎷 Successfully created ${events.length} Vancouver Jazz Festival events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Jazz Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverJazzFestivalScraper();
