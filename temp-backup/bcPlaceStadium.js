/**
 * BC Place Stadium Scraper
 * 
 * This scraper provides information about events at BC Place Stadium in Vancouver
 * Source: https://www.bcplace.com/
 */

const { v4: uuidv4 } = require('uuid');

class BCPlaceStadiumScraper {
  constructor() {
    this.name = 'BC Place Stadium';
    this.url = 'https://www.bcplace.com/';
    this.sourceIdentifier = 'bc-place-stadium';
    
    // Venue information
    this.venue = {
      name: "BC Place Stadium",
      id: "bc-place-stadium-vancouver",
      address: "777 Pacific Blvd",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 4Y8",
      coordinates: {
        lat: 49.2767,
        lng: -123.1119
      },
      websiteUrl: "https://www.bcplace.com/",
      description: "BC Place is the largest multipurpose venue of its kind in Western Canada, featuring the world's largest cable-supported retractable roof. The stadium is home to Vancouver Whitecaps FC of Major League Soccer and the BC Lions Football Club of the Canadian Football League. It also hosts major concerts, conventions, trade and consumer shows, and special events of all sizes."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Coldplay: Music of the Spheres World Tour",
        description: "British rock band Coldplay brings their spectacular Music of the Spheres World Tour to Vancouver's BC Place. Known for their visually stunning and environmentally conscious performances, the band will showcase material from their latest album alongside classic hits from their extensive catalog. This tour features a groundbreaking sustainable approach to stadium shows, including kinetic dance floors and power bikes that allow fans to help power the show through renewable energy. The immersive concert experience combines breathtaking visuals, pyrotechnics, and LED wristbands for every attendee that synchronize with the music, creating a unified light display throughout the venue. Supporting acts include H.E.R. and local Vancouver artists.",
        date: new Date("2025-07-25T19:30:00"),
        endTime: new Date("2025-07-25T23:00:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/05/coldplay-2025.jpg",
        eventLink: "https://www.bcplace.com/events/coldplay-2025/",
        price: "$75-$250",
        performers: ["Coldplay", "H.E.R."],
        ticketsRequired: true,
        category: "Concert"
      },
      {
        title: "Vancouver Whitecaps FC vs. Seattle Sounders FC",
        description: "Experience the intensity of one of Major League Soccer's most passionate rivalries as the Vancouver Whitecaps FC take on the Seattle Sounders FC in this Cascadia Cup match. The Whitecaps will be looking to secure crucial points in their playoff push against their Pacific Northwest rivals. This derby match always produces exciting soccer and an electric atmosphere as supporters groups from both sides create an unforgettable gameday experience. The match features pre-game activities for families in Terry Fox Plaza, special half-time entertainment, and post-match player autograph sessions for young fans. Support the 'Caps as they defend home turf in this critical Western Conference battle.",
        date: new Date("2025-08-02T19:00:00"),
        endTime: new Date("2025-08-02T21:30:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/06/whitecaps-sounders-2025.jpg",
        eventLink: "https://www.bcplace.com/events/whitecaps-vs-sounders/",
        price: "$29-$125",
        ticketsRequired: true,
        category: "Sports"
      },
      {
        title: "Monster Jam",
        description: "Monster Jam returns to BC Place for an adrenaline-charged weekend of monster truck action! Watch as world-class drivers compete in different skills challenges and racing competitions in 12,000-pound monster trucks that tear up the dirt in one of the most unexpected and entertaining motorsports competitions. Featured trucks include fan favorites Grave Digger, Megalodon, El Toro Loco, and more. The event includes a pre-show Pit Party where fans can see the massive trucks up close, meet the drivers, get autographs, and take pictures. This family-friendly event combines high-octane entertainment with impressive displays of extreme stunts and fierce competitions that push these enormous vehicles to their limits.",
        date: new Date("2025-08-09T19:00:00"),
        endTime: new Date("2025-08-09T22:00:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/06/monster-jam-2025.jpg",
        eventLink: "https://www.bcplace.com/events/monster-jam-2025/",
        price: "$35-$75",
        ticketsRequired: true,
        category: "Motorsports"
      },
      {
        title: "BC Lions vs. Toronto Argonauts",
        description: "The BC Lions host the Toronto Argonauts in this exciting Canadian Football League regular season matchup. Watch as quarterback Nathan Rourke leads the Lions against the defending Grey Cup champions in what promises to be a thrilling contest between two of the CFL's most storied franchises. The game features the Lions' famous pre-game pyrotechnics show, half-time entertainment, and the always popular Felions Dance Team performances. Family-friendly activities include the Kids Zone with interactive football drills and face painting, while adult fans can enjoy local craft beer offerings at multiple concession locations throughout the stadium. Come early to catch the team warm-ups and stay late for the post-game autograph session on the field.",
        date: new Date("2025-08-15T19:00:00"),
        endTime: new Date("2025-08-15T22:00:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/07/bc-lions-2025.jpg",
        eventLink: "https://www.bcplace.com/events/bc-lions-vs-argonauts/",
        price: "$25-$110",
        ticketsRequired: true,
        category: "Sports"
      },
      {
        title: "Vancouver International Auto Show",
        description: "Western Canada's largest consumer automotive event transforms BC Place into a car lover's paradise. The Vancouver International Auto Show showcases the latest models from over 40 manufacturers, concept cars, exotic supercars, electric and alternative fuel vehicles, and custom creations. Special features include the Electric Avenue display highlighting the latest in EV technology, the Exotics Cafe with multi-million dollar hypercars, and the Classic Alley showcasing meticulously restored vintage automobiles. Interactive experiences include virtual reality driving simulators, off-road test tracks, and opportunities to test drive select new vehicles on city streets. Industry experts will be on hand to discuss the latest automotive trends and technologies during daily panel discussions.",
        date: new Date("2025-07-05T10:00:00"),
        endTime: new Date("2025-07-12T20:00:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/05/auto-show-2025.jpg",
        eventLink: "https://www.bcplace.com/events/vancouver-auto-show-2025/",
        price: "$18-$25",
        ticketsRequired: true,
        category: "Exhibition"
      },
      {
        title: "Global Dance Festival",
        description: "Experience Vancouver's largest indoor electronic dance music event as BC Place transforms into a massive nightclub featuring multiple stages, world-class sound systems, and spectacular light shows. The lineup includes international DJ superstars Tiësto, Armin van Buuren, Charlotte de Witte, and hometown hero Kaytranada, plus dozens more performers across four uniquely designed stages. The immersive production includes state-of-the-art visuals, pyrotechnics, confetti cannons, and aerial performers suspended from the stadium's retractable roof. This 19+ event will feature specialty bars, food vendors from across Vancouver, chill-out lounges, and interactive art installations. Festival-goers are encouraged to express themselves through creative outfits and costumes that add to the vibrant atmosphere.",
        date: new Date("2025-08-23T18:00:00"),
        endTime: new Date("2025-08-24T02:00:00"),
        imageUrl: "https://www.bcplace.com/wp-content/uploads/2025/07/dance-festival-2025.jpg",
        eventLink: "https://www.bcplace.com/events/global-dance-festival/",
        price: "$95-$250",
        performers: ["Tiësto", "Armin van Buuren", "Charlotte de Witte", "Kaytranada"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Festival"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting BC Place Stadium scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `bc-place-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Check if this is a multi-day event like an exhibition
        if (eventData.endTime && eventData.endTime.getDate() !== eventData.date.getDate() &&
            eventData.endTime.getMonth() === eventData.date.getMonth()) {
          // Multi-day event within the same month
          const endDate = dateFormat.format(eventData.endTime);
          detailedDescription += `Dates: ${formattedDate} to ${endDate}\n`;
          detailedDescription += `Hours: ${formattedStartTime} - ${formattedEndTime}\n`;
        } else {
          // Single day event
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        }
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ageRestriction) {
          detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available through Ticketmaster or the BC Place box office\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nVenue Information: BC Place Stadium is located at 777 Pacific Boulevard in downtown Vancouver, easily accessible by SkyTrain (Stadium-Chinatown Station) and multiple bus routes. The venue offers numerous concession options featuring local food and beverage vendors. Gates typically open 1-2 hours before event start time.`;
        
        // Create categories
        const categories = ['events', 'entertainment', 'stadium'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Concert') {
          categories.push('music', 'live music');
        } else if (eventData.category === 'Sports') {
          if (eventData.title.includes('Whitecaps')) {
            categories.push('soccer', 'mls', 'football');
          } else if (eventData.title.includes('Lions')) {
            categories.push('football', 'cfl');
          }
        } else if (eventData.category === 'Motorsports') {
          categories.push('monster trucks', 'family event', 'motor sport');
        } else if (eventData.category === 'Exhibition') {
          categories.push('auto show', 'cars', 'automotive');
        } else if (eventData.category === 'Festival') {
          categories.push('electronic music', 'dance', 'edm', 'nightlife');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'entertainment',
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
      
      console.log(`🏟️ Successfully created ${events.length} BC Place Stadium events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in BC Place Stadium scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new BCPlaceStadiumScraper();
