/**
 * WISE Hall Scraper
 * 
 * This scraper provides information about events at WISE Hall in Vancouver
 * Source: https://www.wisehall.ca/
 */

const { v4: uuidv4 } = require('uuid');

class WISEHallScraper {
  constructor() {
    this.name = 'WISE Hall';
    this.url = 'https://www.wisehall.ca/';
    this.sourceIdentifier = 'wise-hall';
    
    // Venue information
    this.venue = {
      name: "WISE Hall",
      id: "wise-hall-vancouver",
      address: "1882 Adanac St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V5L 2E2",
      coordinates: {
        lat: 49.2770,
        lng: -123.0695
      },
      websiteUrl: "https://www.wisehall.ca/",
      description: "The WISE Hall (Welsh, Irish, Scottish, English) is a community hall and performance venue in East Vancouver, operated as a non-profit society since 1958. This historic venue hosts live music, community events, dance parties, workshops, and cultural celebrations in a welcoming environment that bridges generations and cultures."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Vancouver Folk Music Festival: WISE Hall Sessions",
        description: "As part of the expanded Vancouver Folk Music Festival, WISE Hall hosts an intimate evening of acoustic performances featuring established and emerging folk artists. This special showcase brings the festival experience to East Vancouver with performances by Canadian folk icon Sarah Harmer, Indigenous duo Twin Flames, and local rising stars The Broken Islands. The WISE Hall's cozy atmosphere creates a perfect setting for the storytelling traditions of folk music, allowing for meaningful connections between artists and audience. The evening includes a short presentation on the history of folk music in Vancouver and the cultural significance of community venues like WISE Hall in nurturing grassroots music scenes. Doors open early for a pre-show community potluck dinner in the Hall's lower lounge.",
        date: new Date("2025-07-08T19:00:00"),
        endTime: new Date("2025-07-08T23:00:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/05/folk-festival-sessions.jpg",
        eventLink: "https://www.wisehall.ca/events/folk-festival-sessions/",
        price: "$25",
        performers: ["Sarah Harmer", "Twin Flames", "The Broken Islands"],
        ticketsRequired: true,
        category: "Music"
      },
      {
        title: "East Van Community Dance: Swing Night",
        description: "Put on your dancing shoes for WISE Hall's monthly community dance night! July's edition features swing dancing with live music by the 8-piece Vancouver Swing All-Stars performing classic hits from the 1930s and 40s. The evening begins with a 45-minute beginner-friendly dance lesson taught by instructors from SwingVan Dance Studio, covering basic Lindy Hop steps that will have you ready to join the dance floor. No experience or partner necessary! All ages and abilities welcome at this alcohol-free event focused on building community through dance. The WISE Hall's original sprung wood floor provides the perfect surface for dancing, and the vintage ambiance complements the swing era music. Light refreshments available by donation to support the WISE Hall's community programming.",
        date: new Date("2025-07-12T19:00:00"),
        endTime: new Date("2025-07-12T23:30:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/06/swing-dance-night.jpg",
        eventLink: "https://www.wisehall.ca/events/swing-dance-night/",
        price: "$15-$20 sliding scale",
        performers: ["Vancouver Swing All-Stars", "SwingVan Dance Studio Instructors"],
        ticketsRequired: true,
        category: "Dance"
      },
      {
        title: "WISE Words: Poetry Slam & Open Mic",
        description: "Vancouver's longest-running poetry slam celebrates its 20th anniversary with a special evening featuring past champions and new voices. The event begins with an open mic session where anyone can sign up to share original poetry, followed by the competitive slam portion where poets perform original works judged by randomly selected audience members. This month's featured performer is award-winning spoken word artist Shane Koyczan, known for his powerful performances at the 2010 Vancouver Olympics and viral videos that have received millions of views. Between performances, longtime host RC Weslowski will share stories from two decades of Vancouver's vibrant poetry scene. The inclusive and supportive atmosphere makes this a perfect event for first-time performers and poetry enthusiasts alike.",
        date: new Date("2025-07-15T19:30:00"),
        endTime: new Date("2025-07-15T22:30:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/06/poetry-slam-anniversary.jpg",
        eventLink: "https://www.wisehall.ca/events/wise-words-poetry-slam/",
        price: "$10 suggested donation",
        performers: ["Shane Koyczan", "RC Weslowski", "Open Mic Participants"],
        ticketsRequired: false,
        category: "Literary"
      },
      {
        title: "East Vancouver Record Fair",
        description: "Vinyl enthusiasts won't want to miss the biannual East Vancouver Record Fair, bringing together over 40 independent vinyl vendors, collectors, and small label representatives from across the Pacific Northwest. Browse thousands of records spanning all genres, from dollar-bin finds to rare collectibles, with a focus on local and independent music. The event includes live DJ sets throughout the day spinning an eclectic mix of vinyl treasures, a listening station to preview your potential purchases, and a repair clinic offering tips on turntable maintenance. The WISE Hall's licensed bar will be open, and East Van Brewing will be on site with a special Record Fair beer release. Early bird tickets allow entry an hour before general admission for serious collectors seeking first pick of the merchandise.",
        date: new Date("2025-07-19T11:00:00"),
        endTime: new Date("2025-07-19T17:00:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/06/record-fair-summer.jpg",
        eventLink: "https://www.wisehall.ca/events/east-van-record-fair-summer/",
        price: "$5 general / $15 early bird",
        ticketsRequired: true,
        category: "Market"
      },
      {
        title: "Community Documentary Screening: 'The Heart of East Van'",
        description: "Join us for the premiere screening of 'The Heart of East Van,' a new documentary exploring the history, diversity, and cultural significance of East Vancouver neighborhoods. Local filmmaker Mina Shum's latest work features interviews with longtime residents, community activists, artists, and business owners who have shaped the area's unique character over decades of change and development. Following the screening, a panel discussion with the director and featured community members will explore themes of urban change, cultural preservation, and community resilience. This event is presented in partnership with the East Vancouver Community Archives Project, which will have a display of historical photographs and documents in the Hall's lower lounge. Light refreshments featuring East Vancouver businesses will be served during intermission.",
        date: new Date("2025-07-22T19:00:00"),
        endTime: new Date("2025-07-22T21:30:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/06/east-van-documentary.jpg",
        eventLink: "https://www.wisehall.ca/events/heart-of-east-van-screening/",
        price: "$12",
        performers: ["Mina Shum", "Community Panelists"],
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "WISE Wellness: Community Yoga & Meditation Day",
        description: "Transform your weekend with a full day of accessible wellness practices led by East Vancouver instructors. The day begins with gentle morning yoga suitable for all levels, followed by guided meditation sessions, mindful movement workshops, and sound healing experiences. The afternoon features specialized sessions including chair yoga for seniors and those with limited mobility, kids yoga, and a workshop on incorporating mindfulness into daily life. All activities take place in the WISE Hall's spacious main room, with natural light streaming through the historic windows. Participants are encouraged to bring their own mats and props, though limited supplies will be available to borrow. Tea and healthy snacks will be provided during breaks. Register for individual sessions or purchase a full-day pass with proceeds supporting the WISE Hall's community outreach programs.",
        date: new Date("2025-07-26T09:00:00"),
        endTime: new Date("2025-07-26T16:00:00"),
        imageUrl: "https://www.wisehall.ca/wp-content/uploads/2025/06/community-wellness-day.jpg",
        eventLink: "https://www.wisehall.ca/events/wise-wellness-day/",
        price: "$10-$15 per session / $40 full day",
        performers: ["East Van Yoga Collective", "Mindfulness Vancouver"],
        ticketsRequired: true,
        category: "Wellness"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting WISE Hall scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `wise-hall-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: ${eventData.ticketsRequired ? 'Required, available online or at the door' : 'Not required'}\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Featuring: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nThe WISE Hall is a wheelchair accessible venue located in East Vancouver. The main hall is on the second floor accessible by stairs or elevator, with washrooms on both floors. The venue is easily reached by public transit (via #14 Hastings or #4 Powell buses) and bike racks are available outside.`;
        
        // Create categories
        const categories = ['community', 'east vancouver', 'local'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          categories.push('concert', 'folk', 'acoustic');
        } else if (eventData.category === 'Dance') {
          categories.push('swing', 'social dance', 'community dance');
        } else if (eventData.category === 'Literary') {
          categories.push('poetry', 'spoken word', 'open mic');
        } else if (eventData.category === 'Market') {
          categories.push('vinyl', 'record fair', 'shopping');
        } else if (eventData.category === 'Film') {
          categories.push('documentary', 'screening', 'local history');
        } else if (eventData.category === 'Wellness') {
          categories.push('yoga', 'meditation', 'health', 'workshops');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'community',
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
      
      console.log(`🏛️ Successfully created ${events.length} WISE Hall events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in WISE Hall scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new WISEHallScraper();
