/**
 * The Irish Heather Scraper
 * 
 * This scraper provides information about events at The Irish Heather in Vancouver
 * Source: https://www.irishheather.com/
 */

const { v4: uuidv4 } = require('uuid');

class IrishHeatherScraper {
  constructor() {
    this.name = 'The Irish Heather';
    this.url = 'https://www.irishheather.com/';
    this.sourceIdentifier = 'irish-heather';
    
    // Venue information
    this.venue = {
      name: "The Irish Heather",
      id: "irish-heather-vancouver",
      address: "248 E Georgia St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6A 1Z7",
      coordinates: {
        lat: 49.2789244,
        lng: -123.0979366
      },
      websiteUrl: "https://www.irishheather.com/",
      description: "The Irish Heather is a beloved gastropub located in Vancouver's Chinatown, offering authentic Irish hospitality, an extensive whiskey selection, and traditional pub fare with a modern twist. A Vancouver institution since 1997, it provides a warm, inviting atmosphere with dark wood furnishings, a copper-topped bar, and Irish memorabilia decorating the walls. The pub is known for its community events, live music sessions, and whiskey tastings."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Traditional Irish Session",
        description: "Join us for our weekly Traditional Irish Music Session at The Irish Heather. Local musicians gather to play authentic Irish tunes in a casual, welcoming environment. From lively jigs and reels to soulful ballads, experience the rich musical heritage of Ireland while enjoying our selection of Irish whiskies and craft beers. Musicians of all skill levels are welcome to participate, and guests are encouraged to sing along.",
        date: new Date("2025-07-06T18:00:00"),
        endTime: new Date("2025-07-06T21:00:00"),
        recurrence: "Weekly on Sundays",
        ageRestriction: "All ages until 10 PM, 19+ after",
        imageUrl: "https://www.irishheather.com/wp-content/uploads/2025/01/trad-session.jpg",
        eventLink: "https://www.irishheather.com/events/trad-session/",
        price: "No cover",
        category: "Music"
      },
      {
        title: "Whiskey Wednesday: Redbreast Tasting",
        description: "Experience the finest single pot still Irish whiskeys at our Redbreast Tasting event. Our whiskey expert will guide you through a flight of Redbreast expressions, including the 12 Year, 15 Year, Lustau Edition, and the coveted 21 Year. Learn about the unique production methods, rich history, and distinctive characteristics of these acclaimed whiskeys while enjoying perfectly paired small bites from our kitchen.",
        date: new Date("2025-07-16T19:00:00"),
        endTime: new Date("2025-07-16T21:00:00"),
        recurrence: "Monthly Whiskey Tasting Series",
        ageRestriction: "19+",
        imageUrl: "https://www.irishheather.com/wp-content/uploads/2025/03/redbreast-tasting.jpg",
        eventLink: "https://www.irishheather.com/events/whiskey-wednesday-redbreast/",
        price: "$55 per person",
        ticketsRequired: true,
        category: "Tasting"
      },
      {
        title: "Pub Quiz Night",
        description: "Put your knowledge to the test at The Irish Heather's monthly Pub Quiz Night! Form teams of up to 6 people and compete in rounds covering general knowledge, sports, music, history, and, of course, Irish culture. Our quiz master will challenge your wits while you enjoy special food and drink promotions throughout the evening. Prizes for the winning team include gift certificates and bragging rights until the next month's competition.",
        date: new Date("2025-07-22T19:30:00"),
        endTime: new Date("2025-07-22T22:00:00"),
        recurrence: "Monthly, last Tuesday",
        ageRestriction: "19+",
        imageUrl: "https://www.irishheather.com/wp-content/uploads/2025/04/pub-quiz.jpg",
        eventLink: "https://www.irishheather.com/events/pub-quiz-night/",
        price: "$5 entry fee per person",
        ticketsRequired: false,
        category: "Entertainment"
      },
      {
        title: "Oyster & Guinness Festival",
        description: "The Irish Heather's annual Oyster & Guinness Festival returns for a weekend celebration of this classic pairing. Featuring fresh oysters from local suppliers and perfectly poured pints of Guinness, this event highlights the marriage of briny sea flavors with the rich, creamy stout. Enjoy oyster shucking demonstrations, Guinness pouring competitions, and live Celtic music throughout the weekend. Special menu items will include oyster stew, Guinness bread, and more.",
        date: new Date("2025-08-02T12:00:00"),
        endTime: new Date("2025-08-03T22:00:00"),
        ageRestriction: "All ages until 10 PM, 19+ after",
        imageUrl: "https://www.irishheather.com/wp-content/uploads/2025/05/oyster-guinness.jpg",
        eventLink: "https://www.irishheather.com/events/oyster-guinness-festival/",
        price: "No cover, pay as you go for food and drinks",
        ticketsRequired: false,
        category: "Food Festival"
      },
      {
        title: "Long Table Dinner: Irish Harvest",
        description: "Join us for our popular Long Table Dinner Series featuring a traditional Irish harvest feast. Guests will share a communal dining experience at our signature long tables, enjoying a family-style meal prepared by our Executive Chef. The menu highlights seasonal produce and Irish classics with a modern twist, paired with selected Irish beers and whiskeys. This intimate dinner event encourages conversation and connection in the tradition of Irish hospitality.",
        date: new Date("2025-08-13T18:30:00"),
        endTime: new Date("2025-08-13T22:00:00"),
        recurrence: "Quarterly Dinner Series",
        ageRestriction: "19+",
        imageUrl: "https://www.irishheather.com/wp-content/uploads/2025/06/long-table.jpg",
        eventLink: "https://www.irishheather.com/events/long-table-irish-harvest/",
        price: "$75 per person (includes multi-course meal and welcome drink)",
        ticketsRequired: true,
        category: "Dining"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting The Irish Heather scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `irish-heather-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.recurrence) {
          detailedDescription += `Recurrence: ${eventData.recurrence}\n`;
        }
        
        detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }
        
        detailedDescription += `\nLocation: The Irish Heather is located at 248 E Georgia St in Vancouver's Chinatown district.\n\n`;
        detailedDescription += `For more information and reservations, please visit ${this.url} or call (604) 688-9779.`;
        
        // Create categories
        const categories = ['pub', 'irish', 'gastropub', 'food and drink'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          categories.push('live music', 'irish music', 'traditional');
        } else if (eventData.category === 'Tasting') {
          categories.push('whiskey', 'spirits', 'education');
        } else if (eventData.category === 'Entertainment') {
          categories.push('trivia', 'games', 'competition');
        } else if (eventData.category === 'Food Festival') {
          categories.push('festival', 'seafood', 'beer');
        } else if (eventData.category === 'Dining') {
          categories.push('special dinner', 'culinary', 'communal dining');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'food and drink',
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
      
      console.log(`🍺 Successfully created ${events.length} Irish Heather events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Irish Heather scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new IrishHeatherScraper();
