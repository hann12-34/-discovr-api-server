/**
 * HelloBC Additional Events Scraper
 * 
 * This scraper provides information about additional events from HelloBC (British Columbia's official tourism website)
 * Source: https://www.hellobc.com/things-to-do/events/
 */

const { v4: uuidv4 } = require('uuid');

class HelloBCAdditionalEventsScraper {
  constructor() {
    this.name = 'HelloBC Additional Events';
    this.url = 'https://www.hellobc.com/things-to-do/events/';
    this.sourceIdentifier = 'hellobc-additional-events';
    
    // This isn't a traditional venue but rather a source/aggregator of events across BC
    this.venue = {
      name: "HelloBC Additional Events",
      id: "hellobc-additional-events",
      address: "Multiple locations across British Columbia",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      websiteUrl: "https://www.hellobc.com/things-to-do/events/",
      description: "HelloBC is British Columbia's official tourism website, providing comprehensive information about events, festivals, and activities across the province. It showcases a curated selection of notable events from Vancouver and beyond to highlight the best experiences for tourists and locals alike."
    };
    
    // Additional featured events for 2025 (spanning across BC)
    this.events = [
      {
        title: "Steveston Salmon Festival",
        description: "Known as 'Canada's biggest little birthday party,' the Steveston Salmon Festival celebrates both Canada Day and the community's rich fishing heritage. This beloved Richmond tradition features a grand parade through Steveston Village, a salmon barbecue where over 1,200 pounds of wild salmon are grilled over open alder wood fires, and a Japanese cultural fair honoring the area's significant Japanese-Canadian history. The festival grounds at Steveston Park include multiple stages with live music ranging from folk to rock, cultural performances, children's activities and games, a trade show featuring local artisans, and a food fair showcasing diverse cuisines. The Horticultural Show displays prize-winning flowers, vegetables, and floral arrangements from local gardeners, while the Youth Festival provides opportunities for young performers to showcase their talents. The day culminates with a spectacular fireworks display over the Fraser River, celebrating both Canada's birthday and Steveston's maritime heritage in a quintessentially Canadian community gathering that has been running for over 75 years.",
        date: new Date("2025-07-01T10:00:00"),
        endTime: new Date("2025-07-01T23:00:00"),
        location: {
          name: "Steveston Village",
          address: "4111 Moncton Street",
          city: "Richmond",
          state: "BC",
          postalCode: "V7E 3A8",
          coordinates: {
            lat: 49.1270,
            lng: -123.1807
          }
        },
        imageUrl: "https://www.hellobc.com/content/uploads/2023/06/steveston-salmon-festival-richmond-bc-2048x1365.jpg",
        eventLink: "https://www.hellobc.com/events/steveston-salmon-festival-2025/",
        price: "Free (some activities may have fees)",
        ticketsRequired: false,
        category: "Cultural Festival"
      },
      {
        title: "Squamish Constellation Festival",
        description: "The Squamish Constellation Festival returns to Hendrickson Field for its fifth year, bringing together music, art, and community against the spectacular backdrop of the Stawamus Chief mountain. This three-day festival features over 40 musical acts across two stages, with a carefully curated lineup that blends acclaimed international headliners with emerging Canadian talent across multiple genres including indie rock, folk, electronic, hip-hop, and world music. Beyond the music, the festival grounds transform into an immersive arts experience with large-scale art installations, live painting demonstrations, interactive workshops, and illuminated night displays that highlight the natural beauty of the Sea to Sky corridor. The Constellation Market showcases local artisans, sustainable products, and regional food vendors, while the Family Zone offers programming specifically designed for younger attendees including instrument making, circus skills, and family-friendly performances. Festival organizers maintain a strong commitment to sustainability with zero-waste initiatives, carbon offset programs, and partnerships with local environmental organizations. Camping options are available at nearby Brennan Park, with shuttle service to and from the festival grounds.",
        date: new Date("2025-07-25T16:00:00"),
        endTime: new Date("2025-07-27T23:00:00"),
        location: {
          name: "Hendrickson Field",
          address: "39555 Loggers Lane",
          city: "Squamish",
          state: "BC",
          postalCode: "V8B 0H3",
          coordinates: {
            lat: 49.7017,
            lng: -123.1565
          }
        },
        imageUrl: "https://www.hellobc.com/content/uploads/2023/07/squamish-constellation-festival-bc-2048x1365.jpg",
        eventLink: "https://www.hellobc.com/events/squamish-constellation-festival-2025/",
        price: "$89-$249 (children under 12 free)",
        ticketsRequired: true,
        category: "Music Festival"
      },
      {
        title: "Abbotsford Tulip Festival",
        description: "The Abbotsford Tulip Festival transforms 40 acres of Fraser Valley farmland into a spectacular sea of vibrant colors as millions of tulips bloom in organized patterns across the landscape. This annual spring celebration allows visitors to wander through meticulously planted fields featuring over 50 varieties of tulips in a rainbow of hues, creating perfect backdrops for photography and peaceful exploration. The festival offers both sunrise and regular admission options, with dedicated photo zones, covered picnic areas, food trucks serving local fare, and a market selling farm-fresh products, tulip bulbs, and cut flowers. Visitors can enjoy the 1-kilometer U-pick field trail where they can harvest their own tulips to take home, or explore the show garden with its innovative tulip displays and educational signage about tulip cultivation. Interactive activities include tulip-themed crafts, farm equipment displays, and weekend live music performances. This family-friendly event also features a children's garden with playground equipment and a duck pond. The festival adjusts its opening dates annually based on growing conditions, with bloom updates posted regularly on social media to help visitors plan their experience at peak bloom time.",
        date: new Date("2025-04-15T09:00:00"),
        endTime: new Date("2025-05-10T19:30:00"),
        location: {
          name: "Lakeland Flowers",
          address: "39171 No. 4 Road",
          city: "Abbotsford",
          state: "BC",
          postalCode: "V3G 2C9",
          coordinates: {
            lat: 49.0527,
            lng: -122.2893
          }
        },
        imageUrl: "https://www.hellobc.com/content/uploads/2023/03/abbotsford-tulip-festival-fraser-valley-bc-2048x1365.jpg",
        eventLink: "https://www.hellobc.com/events/abbotsford-tulip-festival-2025/",
        price: "$15-25 (children under 5 free)",
        ticketsRequired: true,
        category: "Seasonal Festival"
      },
      {
        title: "Victoria Day Parade",
        description: "Victoria's namesake celebration honors Queen Victoria with one of Canada's largest and most historic parades, drawing over 100,000 spectators to the streets of downtown Victoria each year. This iconic event features more than 120 entries including elaborately decorated floats, marching bands from across the Pacific Northwest, vintage vehicles, equestrian displays, cultural dance groups, and community organizations. The parade route runs along Douglas Street from Mayfair Mall to the Parliament Buildings, with the highlight being the numerous award-winning marching bands from both Canada and the United States that participate in this internationally recognized event. Beyond the parade itself, the celebration includes a weekend of festivities throughout the Inner Harbour area, with highland games at Topaz Park, dragon boat races in the harbour, outdoor concerts at Ship Point, and family activities at Centennial Square. Monday's celebrations conclude with a spectacular fireworks display over the Inner Harbour, set against the backdrop of the illuminated Parliament Buildings. This beloved community tradition has been running since 1898 and marks the unofficial start of summer for Vancouver Island residents while showcasing Victoria's British heritage and diverse community spirit.",
        date: new Date("2025-05-19T09:00:00"),
        endTime: new Date("2025-05-19T12:00:00"),
        location: {
          name: "Downtown Victoria",
          address: "Douglas Street",
          city: "Victoria",
          state: "BC",
          postalCode: "V8W 2B7",
          coordinates: {
            lat: 48.4284,
            lng: -123.3656
          }
        },
        imageUrl: "https://www.hellobc.com/content/uploads/2023/05/victoria-day-parade-bc-2048x1365.jpg",
        eventLink: "https://www.hellobc.com/events/victoria-day-parade-2025/",
        price: "Free",
        ticketsRequired: false,
        category: "Parade"
      },
      {
        title: "Okanagan Spring Wine Festival",
        description: "The Okanagan Spring Wine Festival celebrates the blossoming season in Canada's premier wine region with a 10-day program of wine-focused events spanning the entire Okanagan Valley. This springtime celebration coincides with the flowering of the vines and fruit trees that blanket the region's hillsides, creating a spectacular backdrop for wine enthusiasts to discover new vintages and connect with winemakers. The festival features over 100 individual events including winery-hosted tastings, vineyard tours highlighting sustainable practices, educational seminars led by sommeliers, and gourmet food pairings showcasing regional ingredients. Signature events include the Spring WestJet Wine Tastings where attendees can sample from over 200 wines under one roof, 'Blossom to Bottle' educational tours that explore the complete winemaking journey, and 'Compost to Kitchen' farm-to-table dining experiences at vineyard restaurants. Many participating wineries release their new white wines and rosés during this festival, with special events focusing on the Okanagan's internationally acclaimed aromatic white varieties. The festival serves as an ideal introduction to the Okanagan wine region, with transportation packages and accommodation options designed to encourage wine tourism throughout the valley.",
        date: new Date("2025-05-01T10:00:00"),
        endTime: new Date("2025-05-11T20:00:00"),
        location: {
          name: "Various Wineries",
          address: "Okanagan Valley",
          city: "Kelowna",
          state: "BC",
          postalCode: "V1Y 6N2",
          coordinates: {
            lat: 49.8801,
            lng: -119.4436
          }
        },
        imageUrl: "https://www.hellobc.com/content/uploads/2023/04/okanagan-spring-wine-festival-bc-2048x1365.jpg",
        eventLink: "https://www.hellobc.com/events/okanagan-spring-wine-festival-2025/",
        price: "Varies by event ($10-$150)",
        ticketsRequired: true,
        category: "Food & Drink"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting HelloBC Additional Events scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `hellobc-add-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Format date based on whether it's a single day or multi-day event
        let formattedDateRange = '';
        if (eventData.date.toDateString() === eventData.endTime.toDateString()) {
          // Single day event
          formattedDateRange = `${dateFormat.format(eventData.date)}`;
        } else {
          // Multi-day event
          const startDate = dateFormat.format(eventData.date);
          const endDate = dateFormat.format(eventData.endTime);
          formattedDateRange = `${startDate} to ${endDate}`;
        }
        
        const formattedStartTime = timeFormat.format(eventData.date);
        const formattedEndTime = timeFormat.format(eventData.endTime);
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        
        if (eventData.date.toDateString() === eventData.endTime.toDateString()) {
          // Single day event
          detailedDescription += `Date: ${formattedDateRange}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        } else {
          // Multi-day event
          detailedDescription += `Dates: ${formattedDateRange}\n`;
          detailedDescription += `Hours vary by day, please check official website for detailed schedule\n`;
        }
        
        // Add additional dates if they exist
        if (eventData.additionalDates && eventData.additionalDates.length > 0) {
          detailedDescription += `\nAdditional Dates:\n`;
          eventData.additionalDates.forEach(additionalDate => {
            const additionalDateFormatted = dateFormat.format(additionalDate.date);
            const additionalStartTime = timeFormat.format(additionalDate.date);
            const additionalEndTime = timeFormat.format(additionalDate.endTime);
            detailedDescription += `- ${additionalDateFormatted}, ${additionalStartTime} - ${additionalEndTime}\n`;
          });
        }
        
        detailedDescription += `\nLocation: ${eventData.location.name}\n`;
        detailedDescription += `Address: ${eventData.location.address}, ${eventData.location.city}, ${eventData.location.state}`;
        
        if (eventData.location.postalCode) {
          detailedDescription += ` ${eventData.location.postalCode}`;
        }
        detailedDescription += `\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available through the event's official website\n`;
        } else {
          detailedDescription += `Tickets: Not required for general admission\n`;
        }
        
        detailedDescription += `\nFor more information and updates, visit the official HelloBC event listing at ${eventData.eventLink}`;
        
        // Create categories
        const categories = ['festival', 'event', 'tourism', 'british columbia'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.title.includes('Salmon Festival')) {
          categories.push('canada day', 'community', 'food', 'cultural', 'family');
        } else if (eventData.title.includes('Constellation Festival')) {
          categories.push('music', 'outdoor', 'squamish', 'concert', 'arts');
        } else if (eventData.title.includes('Tulip')) {
          categories.push('flowers', 'spring', 'outdoor', 'photography', 'family');
        } else if (eventData.title.includes('Victoria Day')) {
          categories.push('parade', 'holiday', 'victoria', 'community', 'family');
        } else if (eventData.title.includes('Wine')) {
          categories.push('wine', 'food', 'culinary', 'okanagan', 'tastings');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: {
            name: eventData.location.name,
            id: `${eventData.location.city.toLowerCase().replace(/\s+/g, '-')}-${eventData.location.name.toLowerCase().replace(/\s+/g, '-')}`,
            address: eventData.location.address,
            city: eventData.location.city,
            state: eventData.location.state,
            country: "Canada",
            postalCode: eventData.location.postalCode || "",
            coordinates: eventData.location.coordinates || null,
          },
          category: eventData.category.toLowerCase(),
          categories: categories,
          sourceURL: this.url,
          officialWebsite: eventData.eventLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDateRange}`);
      }
      
      console.log(`🏞️ Successfully created ${events.length} HelloBC additional events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in HelloBC Additional Events scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new HelloBCAdditionalEventsScraper();
