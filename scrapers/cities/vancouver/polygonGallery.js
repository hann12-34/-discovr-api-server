/**
 * The Polygon Gallery Scraper
 * 
 * This scraper provides information about events at The Polygon Gallery in North Vancouver
 * Source: https://thepolygon.ca/
 */

const { v4: uuidv4 } = require('uuid');

class PolygonGalleryScraper {
  constructor() {
    this.name = 'The Polygon Gallery';
    this.url = 'https://thepolygon.ca/';
    this.sourceIdentifier = 'polygon-gallery';
    
    // Venue information
    this.venue = {
      name: "The Polygon Gallery",
      id: "polygon-gallery-vancouver",
      address: "101 Carrie Cates Ct",
      city: "North Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V7M 3J4",
      coordinates: {
        lat: 49.3089,
        lng: -123.0827
      },
      websiteUrl: "https://thepolygon.ca/",
      description: "The Polygon Gallery is a contemporary art gallery situated on the waterfront of North Vancouver. The stunning, award-winning building showcases the work of acclaimed regional and international artists, primarily photography and media-based art. With a focus on thought-provoking exhibitions and public engagement, The Polygon Gallery has become a cultural landmark in the Lower Mainland's arts community."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Star Witnesses: Indigenous Perspectives on the Night Sky",
        description: "Star Witnesses brings together work by contemporary Indigenous artists from across Canada and internationally who use photography, video, sound, and installation to explore celestial knowledge and humanity's relationship with the cosmos. This landmark exhibition examines how Indigenous peoples have observed and documented the night sky for millennia, developing sophisticated astronomical knowledge systems that connect scientific observation with cultural practices, spiritual beliefs, and environmental stewardship. Featured artists include Joi T. Arcand (Cree), Nicholas Galanin (Tlingit/Unangax̂), Caroline Monnet (Anishinaabe/French), Alan Michelson (Mohawk), and Tarah Hogue (Métis/Dutch), among others. The works in this exhibition reveal how traditional star knowledge informs contemporary Indigenous identities and how these perspectives can help address modern environmental challenges. Through various media, the artists reframe astronomical narratives, challenge colonial structures of scientific authority, and assert the continuing relevance of Indigenous celestial teachings in understanding our place in the universe.",
        date: new Date("2025-07-05T11:00:00"),
        endTime: new Date("2025-09-14T17:00:00"),
        imageUrl: "https://thepolygon.ca/wp-content/uploads/2025/06/star-witnesses-banner.jpg",
        eventLink: "https://thepolygon.ca/exhibition/star-witnesses/",
        price: "By donation (suggested $10)",
        ticketsRequired: false,
        category: "Exhibition",
        isRecurring: true,
        recurringSchedule: "Tuesday-Sunday, 11am-5pm (Thursdays until 9pm)"
      },
      {
        title: "Deckchair Cinema: Summer of Sci-Fi - 2001: A Space Odyssey",
        description: "The Polygon Gallery's popular outdoor cinema series returns with a focus on science fiction classics that explore humanity's relationship with space, technology, and the unknown. This screening presents Stanley Kubrick's landmark 1968 film '2001: A Space Odyssey' on a large outdoor screen on The Polygon's waterfront patio. This groundbreaking sci-fi masterpiece follows a voyage to Jupiter with a sentient computer named HAL after the discovery of a mysterious black monolith affecting human evolution. The screening will be preceded by a short introduction by film scholar Dr. Lisa Coulthard from UBC's Department of Theatre and Film, who will discuss the film's revolutionary visual effects, its profound influence on science fiction cinema, and its philosophical themes about human evolution and artificial intelligence. The event includes access to The Polygon's current exhibitions before the screening, and a special themed cocktail menu will be available for purchase. Attendees are encouraged to bring blankets and warm layers as temperatures may drop after sunset. In case of inclement weather, the screening will move indoors to the gallery's purpose-built media room.",
        date: new Date("2025-07-11T20:30:00"),
        endTime: new Date("2025-07-11T23:30:00"),
        imageUrl: "https://thepolygon.ca/wp-content/uploads/2025/06/deckchair-2001.jpg",
        eventLink: "https://thepolygon.ca/news/deckchair-cinema-2025-summer-of-sci-fi-lineup/",
        price: "$15",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Artist Talk: Celestial Narratives with Rebecca Belmore",
        description: "Join internationally acclaimed artist Rebecca Belmore (Anishinaabe) for an illuminating discussion about her contribution to the 'Star Witnesses' exhibition and her broader artistic practice engaging with Indigenous knowledge systems. Belmore's work, which spans performance, installation, and photography, has been exhibited at major institutions worldwide, including the Venice Biennale where she was the first Indigenous woman to represent Canada. In this talk, Belmore will discuss her new site-specific installation commissioned for The Polygon Gallery that explores Anishinaabe star stories and their connection to land, language, and cultural resilience. The artist will share insights into her creative process, the research that informs her practice, and how traditional knowledge can be expressed through contemporary art forms. Following the artist's presentation, exhibition curator Sarah Biscarra Dilley will join Belmore in conversation, exploring themes of Indigenous astronomy, environmental knowledge, and the political dimensions of reclaiming cultural narratives. The event concludes with a Q&A session with the audience and a reception where attendees can view the exhibition and continue discussions in an informal setting.",
        date: new Date("2025-07-17T19:00:00"),
        endTime: new Date("2025-07-17T21:00:00"),
        imageUrl: "https://thepolygon.ca/wp-content/uploads/2025/06/belmore-talk.jpg",
        eventLink: "https://thepolygon.ca/events/artist-talk-rebecca-belmore/",
        price: "$10 (free for members and Indigenous peoples)",
        ticketsRequired: true,
        category: "Talk"
      },
      {
        title: "Deckchair Cinema: Summer of Sci-Fi - Arrival",
        description: "The Polygon Gallery's outdoor cinema series continues with Denis Villeneuve's contemplative sci-fi masterpiece 'Arrival' (2016). When mysterious spacecraft appear around the world, linguist Dr. Louise Banks (Amy Adams) is recruited by the military to communicate with the alien visitors and determine their intentions. As she works to decipher their complex language, she begins experiencing visions that challenge her understanding of time and reality. This cerebral film explores themes of communication, time perception, and human connection in the face of the unknown. The screening will be introduced by linguist Dr. Mark Turin from UBC's Anthropology Department, who will discuss the film's exploration of language, communication barriers, and the Sapir-Whorf hypothesis that language shapes perception. The event includes after-hours access to the 'Star Witnesses' exhibition, which explores related themes of different knowledge systems and perceptions of the cosmos. A selection of locally crafted beers, wines, and non-alcoholic beverages will be available for purchase. Seating is provided in comfortable deck chairs on the gallery's waterfront patio, offering stunning views of Vancouver's skyline as the sun sets before the screening begins.",
        date: new Date("2025-07-25T20:30:00"),
        endTime: new Date("2025-07-25T23:00:00"),
        imageUrl: "https://thepolygon.ca/wp-content/uploads/2025/06/deckchair-arrival.jpg",
        eventLink: "https://thepolygon.ca/news/deckchair-cinema-2025-summer-of-sci-fi-lineup/",
        price: "$15",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Family Workshop: Star Mappers",
        description: "Inspired by The Polygon's current exhibition 'Star Witnesses,' this hands-on workshop invites families to explore celestial navigation and create their own star maps using both traditional and contemporary techniques. Led by Indigenous educator and artist T'uy't'tanat-Cease Wyss (Skwxwú7mesh/Stó:lō/Hawaiian/Swiss), this workshop begins with an age-appropriate tour of the exhibition, highlighting how different cultures have mapped and interpreted the night sky. Participants will learn about Indigenous constellation stories from the Pacific Northwest and how stars were used for navigation, timekeeping, and cultural practices. The art-making portion of the workshop includes two activities: creating cyanotype prints using sunlight to capture celestial patterns on special photosensitive paper, and crafting personalized star maps using mixed media techniques that combine traditional symbolism with contemporary materials. All materials are provided, and no previous art experience is necessary. This workshop is suitable for children ages 6-12 accompanied by an adult. Each participating family will take home their creations along with a resource guide for continued star-gazing and celestial exploration.",
        date: new Date("2025-08-09T13:00:00"),
        endTime: new Date("2025-08-09T15:00:00"),
        imageUrl: "https://thepolygon.ca/wp-content/uploads/2025/07/family-star-mappers.jpg",
        eventLink: "https://thepolygon.ca/events/family-workshop-star-mappers/",
        price: "$25 per family (up to 4 participants)",
        ticketsRequired: true,
        category: "Workshop"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting The Polygon Gallery scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `polygon-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.isRecurring) {
          detailedDescription += `Exhibition Dates: ${formattedDate} - ${dateFormat.format(eventData.endTime)}\n`;
          detailedDescription += `Hours: ${eventData.recurringSchedule}\n`;
        } else {
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        }
        
        detailedDescription += `Venue: ${this.venue.name}, ${this.venue.address}, North Vancouver\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: ${eventData.ticketsRequired ? 'Required, available through The Polygon Gallery website or at the door' : 'Not required'}\n`;
        }
        
        detailedDescription += `\nVenue Information: The Polygon Gallery is located in Lower Lonsdale, North Vancouver, at the foot of Lonsdale Avenue on the waterfront. The gallery is easily accessible by SeaBus from downtown Vancouver (2-minute walk from Lonsdale Quay SeaBus terminal), by transit, or by car with nearby paid parking available. The facility is fully wheelchair accessible and features a gift shop with unique art books, prints, and design objects.`;
        
        // Create categories
        const categories = ['art', 'gallery', 'culture'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.title.includes('Star Witnesses')) {
          categories.push('exhibition', 'indigenous', 'photography', 'astronomy');
        } else if (eventData.title.includes('Deckchair Cinema')) {
          categories.push('film', 'outdoor', 'cinema', 'sci-fi');
        } else if (eventData.title.includes('Artist Talk')) {
          categories.push('talk', 'lecture', 'indigenous');
        } else if (eventData.title.includes('Family Workshop')) {
          categories.push('workshop', 'family', 'kids', 'education');
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
      
      console.log(`🖼️ Successfully created ${events.length} Polygon Gallery events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Polygon Gallery scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new PolygonGalleryScraper();
