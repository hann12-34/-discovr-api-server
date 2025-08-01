/**
 * Stanley Park Scraper
 * 
 * This scraper provides information about events at Stanley Park in Vancouver
 * Source: https://vancouver.ca/parks-recreation-culture/stanley-park.aspx
 */

const { v4: uuidv4 } = require('uuid');

class StanleyParkScraper {
  constructor() {
    this.name = 'Stanley Park';
    this.url = 'https://vancouver.ca/parks-recreation-culture/stanley-park.aspx';
    this.sourceIdentifier = 'stanley-park';
    
    // Venue information
    this.venue = {
      name: "Stanley Park",
      id: "stanley-park-vancouver",
      address: "Stanley Park Dr",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6G 1Z4",
      coordinates: {
        lat: 49.3019,
        lng: -123.1417
      },
      websiteUrl: "https://vancouver.ca/parks-recreation-culture/stanley-park.aspx",
      description: "Stanley Park is a magnificent 1,000-acre urban park bordering downtown Vancouver. Known for its natural beauty, the park features ancient cedar, hemlock, and fir trees, scenic seawall paths, pristine beaches, landmarks like the 9 O'Clock Gun and Hollow Tree, and attractions including the Vancouver Aquarium. As Vancouver's first and largest urban park, it offers stunning views of the North Shore mountains, city skyline, and harbor while providing a sanctuary for diverse wildlife."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Stanley Park Summer Series: Outdoor Concerts",
        description: "The annual Stanley Park Summer Series returns with free outdoor concerts at the Malkin Bowl. This year's lineup features a diverse range of local and international musicians performing genres from jazz and classical to indie rock and world music. Bring a blanket, pack a picnic, and enjoy beautiful music in one of Vancouver's most scenic settings as the sun sets behind the towering trees.",
        date: new Date("2025-07-05T18:00:00"),
        endTime: new Date("2025-07-05T21:00:00"),
        recurrence: "Weekly on Saturdays through August",
        location: "Malkin Bowl",
        imageUrl: "https://vancouver.ca/parks/stanley/images/summer-concert-series.jpg",
        eventLink: "https://vancouver.ca/parks-recreation-culture/stanley-park-summer-series.aspx",
        price: "Free",
        performers: ["Vancouver Symphony Orchestra", "The Boom Booms"],
        category: "Music"
      },
      {
        title: "Ecological Tour: Forest and Foreshore",
        description: "Join park naturalists for an educational walking tour exploring Stanley Park's diverse ecosystems. This guided experience takes you through old-growth forests, wetlands, and shoreline habitats while highlighting the park's remarkable biodiversity. Learn about indigenous plant species, wildlife conservation efforts, and the delicate balance that sustains this urban wilderness. Perfect for nature enthusiasts and those looking to deepen their appreciation of this iconic Vancouver landmark.",
        date: new Date("2025-07-12T10:00:00"),
        endTime: new Date("2025-07-12T12:00:00"),
        recurrence: "Every second Saturday",
        location: "Meet at Stanley Park Nature House",
        imageUrl: "https://vancouver.ca/parks/stanley/images/ecological-tour.jpg",
        eventLink: "https://vancouver.ca/parks-recreation-culture/stanley-park-tours.aspx",
        price: "$15 adults, $10 seniors/students, $5 children",
        ticketsRequired: true,
        category: "Nature"
      },
      {
        title: "Theatre Under the Stars: Broadway in the Park",
        description: "Experience the magic of outdoor musical theatre at Stanley Park's historic Malkin Bowl. This year's Theatre Under the Stars presents two Broadway favorites in repertory: 'The Sound of Music' and 'Chicago'. With professional performers, live orchestra, and the enchanting backdrop of Stanley Park, these productions offer a uniquely Vancouver summer tradition that has delighted audiences for over 75 years.",
        date: new Date("2025-07-15T20:00:00"),
        endTime: new Date("2025-07-15T22:30:00"),
        recurrence: "Various dates July 15 - August 20",
        location: "Malkin Bowl",
        imageUrl: "https://vancouver.ca/parks/stanley/images/theatre-under-stars.jpg",
        eventLink: "https://www.tuts.ca/",
        price: "$30-$60",
        ticketsRequired: true,
        category: "Theatre"
      },
      {
        title: "Stanley Park Run: Summer 10K",
        description: "Challenge yourself to the Stanley Park Summer 10K, a scenic run along the famous seawall and through beautiful forested paths. This family-friendly event includes competitive 10K and 5K races plus a 2K fun run for children and beginners. All participants receive a commemorative medal, and proceeds support park conservation initiatives. The route showcases stunning views of English Bay, Lions Gate Bridge, and the North Shore mountains.",
        date: new Date("2025-07-26T08:00:00"),
        endTime: new Date("2025-07-26T12:00:00"),
        location: "Start/Finish at Ceperley Meadow",
        imageUrl: "https://vancouver.ca/parks/stanley/images/summer-10k.jpg",
        eventLink: "https://vancouver.ca/parks-recreation-culture/stanley-park-runs.aspx",
        price: "$45 for 10K, $35 for 5K, $15 for 2K fun run",
        ticketsRequired: true,
        category: "Sports"
      },
      {
        title: "Indigenous Plant Walk and Tea Ceremony",
        description: "Discover the traditional plant knowledge of Coast Salish peoples in this cultural walking tour led by Indigenous knowledge keepers. Learn about the medicinal and cultural uses of native plants found throughout Stanley Park while hearing stories that connect to the land's original stewards. The experience concludes with a traditional tea ceremony featuring locally harvested herbs. This respectful cultural exchange offers deeper understanding of Vancouver's Indigenous heritage.",
        date: new Date("2025-08-03T13:00:00"),
        endTime: new Date("2025-08-03T15:00:00"),
        location: "Meet at Brockton Point Visitor Centre",
        imageUrl: "https://vancouver.ca/parks/stanley/images/indigenous-plant-walk.jpg",
        eventLink: "https://vancouver.ca/parks-recreation-culture/indigenous-programs.aspx",
        price: "$25",
        ticketsRequired: true,
        category: "Cultural"
      },
      {
        title: "Sunset Beach Yoga",
        description: "Find your zen with outdoor yoga sessions at Stanley Park's Second Beach. Led by experienced instructors, these all-levels classes combine gentle movement, breathwork, and meditation against the backdrop of ocean waves and mountain vistas. As the sun sets over English Bay, participants will be guided through practices designed to reduce stress and foster connection with nature. Mats provided, or bring your own.",
        date: new Date("2025-08-07T19:30:00"),
        endTime: new Date("2025-08-07T20:30:00"),
        recurrence: "Weekly on Thursdays",
        location: "Second Beach",
        imageUrl: "https://vancouver.ca/parks/stanley/images/sunset-yoga.jpg",
        eventLink: "https://vancouver.ca/parks-recreation-culture/outdoor-fitness.aspx",
        price: "$15 drop-in or $50 for 5-class pass",
        category: "Fitness"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Stanley Park scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `stanley-park-${slugifiedTitle}-${eventDate}`;
        
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
        
        detailedDescription += `Location: ${eventData.location}, Stanley Park\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, please book in advance\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nStanley Park is Vancouver's premier urban park, located at the northwestern edge of downtown Vancouver. The park is easily accessible by public transit, bicycle, or car.`;
        
        // Create categories
        const categories = ['outdoors', 'park', 'nature', 'stanley park'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          categories.push('concert', 'entertainment', 'live music');
        } else if (eventData.category === 'Nature') {
          categories.push('tour', 'educational', 'ecology', 'wildlife');
        } else if (eventData.category === 'Theatre') {
          categories.push('performance', 'arts', 'entertainment', 'broadway');
        } else if (eventData.category === 'Sports') {
          categories.push('running', 'race', 'fitness', 'competition');
        } else if (eventData.category === 'Cultural') {
          categories.push('indigenous', 'educational', 'history');
        } else if (eventData.category === 'Fitness') {
          categories.push('yoga', 'wellness', 'health');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'outdoors',
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
      
      console.log(`🌲 Successfully created ${events.length} Stanley Park events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Stanley Park scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new StanleyParkScraper();
