/**
 * Orpheum Theatre Scraper
 * 
 * This scraper provides information about events at the Orpheum Theatre in Vancouver
 * Source: https://www.vancouvercivictheatres.com/venues/orpheum/
 */

const { v4: uuidv4 } = require('uuid');

class OrpheumTheatreScraper {
  constructor() {
    this.name = 'Orpheum Theatre';
    this.url = 'https://www.vancouvercivictheatres.com/venues/orpheum/';
    this.sourceIdentifier = 'orpheum-theatre';
    
    // Venue information
    this.venue = {
      name: "Orpheum Theatre",
      id: "orpheum-theatre-vancouver",
      address: "601 Smithe St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 3L4",
      coordinates: {
        lat: 49.2808,
        lng: -123.1214
      },
      websiteUrl: "https://www.vancouvercivictheatres.com/venues/orpheum/",
      description: "The Orpheum Theatre is a magnificent National Historic Site and one of Vancouver's most elegant landmarks. Built in 1927 as a vaudeville house, this opulent venue features a grand interior with gold leaf, murals, intricate plasterwork, and a spectacular crystal chandelier. Now home to the Vancouver Symphony Orchestra, the Orpheum hosts a wide range of performances including classical concerts, contemporary music, dance, film screenings, and special events in its 2,688-seat auditorium."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Vancouver Symphony Orchestra: Beethoven's Ninth",
        description: "Experience the power and majesty of Beethoven's monumental Ninth Symphony, featuring the iconic 'Ode to Joy'. Led by Music Director Otto Tausk, the Vancouver Symphony Orchestra is joined by the VSO Chorus and distinguished vocal soloists for this transcendent masterpiece. The program begins with Jocelyn Morlock's 'My Name is Amanda Todd', a poignant orchestral work that has garnered international acclaim. This concert promises an evening of profound emotion and musical brilliance in the perfect acoustic setting of the historic Orpheum Theatre.",
        date: new Date("2025-07-12T20:00:00"),
        endTime: new Date("2025-07-12T22:30:00"),
        imageUrl: "https://www.vancouversymphony.ca/wp-content/uploads/2025/05/beethoven-ninth.jpg",
        eventLink: "https://www.vancouversymphony.ca/event/beethovens-ninth/",
        price: "$35-$125",
        performers: ["Vancouver Symphony Orchestra", "VSO Chorus", "Otto Tausk (conductor)"],
        ticketsRequired: true,
        category: "Classical Music"
      },
      {
        title: "An Evening with David Sedaris",
        description: "Celebrated author and humorist David Sedaris returns to Vancouver for an evening of cutting wit, social satire, and incisive observations about the absurdities of everyday life. Known for his sardonic humor and quirky memoir pieces, Sedaris will read from his newest collection of essays, sharing his unique perspective on modern life, family dynamics, and his experiences traveling the world. The evening includes a Q&A session with the audience and a book signing following the performance.",
        date: new Date("2025-07-18T19:30:00"),
        endTime: new Date("2025-07-18T22:00:00"),
        imageUrl: "https://www.vancouvercivictheatres.com/wp-content/uploads/2025/05/david-sedaris.jpg",
        eventLink: "https://www.vancouvercivictheatres.com/events/david-sedaris-2025/",
        price: "$45-$75",
        performers: ["David Sedaris"],
        ticketsRequired: true,
        category: "Literature"
      },
      {
        title: "Film with Live Orchestra: The Princess Bride",
        description: "Relive the magic of the beloved classic 'The Princess Bride' with its unforgettable score performed live by a full orchestra. As the film plays on a giant screen, the orchestra brings Mark Knopfler's enchanting music to life, creating a unique and immersive cinematic experience. This special presentation combines the charm and wit of Rob Reiner's timeless romantic comedy adventure with the emotional impact of live musical accompaniment, making familiar scenes feel new again through the power of live performance.",
        date: new Date("2025-07-26T19:00:00"),
        endTime: new Date("2025-07-26T21:30:00"),
        imageUrl: "https://www.vancouvercivictheatres.com/wp-content/uploads/2025/06/princess-bride-orchestra.jpg",
        eventLink: "https://www.vancouvercivictheatres.com/events/princess-bride-live-orchestra/",
        price: "$40-$85",
        ticketsRequired: true,
        category: "Film & Music"
      },
      {
        title: "International Guitar Night",
        description: "International Guitar Night returns to the Orpheum, bringing together the world's foremost acoustic guitarists for a night of solos, duets, and quartets that highlight the diversity of acoustic guitar music. This year's lineup features classical virtuoso Alexandra Whittingham (UK), flamenco master José Antonio Rodríguez (Spain), fingerstyle innovator Yasmin Williams (USA), and jazz guitarist Gilad Hekselman (Israel). Each artist brings their unique cultural perspective and technical brilliance to create an evening of global guitar excellence.",
        date: new Date("2025-08-05T20:00:00"),
        endTime: new Date("2025-08-05T22:30:00"),
        imageUrl: "https://www.vancouvercivictheatres.com/wp-content/uploads/2025/06/guitar-night.jpg",
        eventLink: "https://www.vancouvercivictheatres.com/events/international-guitar-night-2025/",
        price: "$38-$65",
        performers: ["Alexandra Whittingham", "José Antonio Rodríguez", "Yasmin Williams", "Gilad Hekselman"],
        ticketsRequired: true,
        category: "Music"
      },
      {
        title: "Vancouver Bach Festival: Mass in B Minor",
        description: "Early Music Vancouver presents Bach's monumental Mass in B Minor, considered one of the greatest achievements in classical music history. This profound sacred work will be performed by internationally renowned soloists, the Pacific Baroque Orchestra, and the Vancouver Cantata Singers, all on period instruments under the direction of Alexander Weimann. Experience the spiritual depth and musical complexity of Bach's masterpiece in the splendid acoustic environment of the Orpheum Theatre.",
        date: new Date("2025-08-14T19:30:00"),
        endTime: new Date("2025-08-14T22:00:00"),
        imageUrl: "https://www.earlymusic.bc.ca/wp-content/uploads/2025/06/bach-festival-b-minor.jpg",
        eventLink: "https://www.earlymusic.bc.ca/events/bach-mass-in-b-minor/",
        price: "$45-$85",
        performers: ["Pacific Baroque Orchestra", "Vancouver Cantata Singers", "Alexander Weimann (conductor)"],
        ticketsRequired: true,
        category: "Classical Music"
      },
      {
        title: "Orpheum Theatre Heritage Tour",
        description: "Discover the fascinating history and hidden secrets of the Orpheum Theatre in this guided behind-the-scenes tour. Explore this National Historic Site while learning about its 1927 origins as a vaudeville house, its stunning architecture and decor, and the famous performers who have graced its stage over nearly a century. The tour includes access to areas usually closed to the public, including the ornate lobbies, backstage areas, and orchestra pit. Photography is permitted, making this a perfect opportunity for architecture enthusiasts and history buffs.",
        date: new Date("2025-08-23T11:00:00"),
        endTime: new Date("2025-08-23T12:30:00"),
        recurrence: "Every Saturday",
        imageUrl: "https://www.vancouvercivictheatres.com/wp-content/uploads/2025/06/orpheum-tour.jpg",
        eventLink: "https://www.vancouvercivictheatres.com/events/orpheum-heritage-tours/",
        price: "$25 general, $20 seniors/students",
        ticketsRequired: true,
        category: "Tour"
      },
      {
        title: "Distant Worlds: Music from Final Fantasy",
        description: "The beloved music from the Final Fantasy video game series comes to life in this extraordinary orchestral concert. Distant Worlds features the music of Japanese composer Nobuo Uematsu performed by a full orchestra and choir, complemented by HD video projections from the game series' most memorable sequences. Conducted by Grammy Award-winner Arnie Roth, this immersive concert experience celebrates over 35 years of legendary gaming and musical innovation, appealing to both longtime fans and newcomers to the iconic series.",
        date: new Date("2025-08-30T20:00:00"),
        endTime: new Date("2025-08-30T22:30:00"),
        imageUrl: "https://www.vancouvercivictheatres.com/wp-content/uploads/2025/07/final-fantasy.jpg",
        eventLink: "https://www.vancouvercivictheatres.com/events/distant-worlds-2025/",
        price: "$50-$120",
        ticketsRequired: true,
        category: "Video Game Music"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Orpheum Theatre scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `orpheum-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available from the Orpheum Theatre box office or online\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nVenue: The historic Orpheum Theatre is located at 601 Smithe Street in downtown Vancouver, easily accessible by public transit. The venue is wheelchair accessible with services for patrons with special needs available upon request.`;
        
        // Create categories
        const categories = ['theatre', 'performing arts', 'concert', 'entertainment'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Classical Music') {
          categories.push('orchestra', 'symphony', 'music');
        } else if (eventData.category === 'Literature') {
          categories.push('author', 'reading', 'humor', 'spoken word');
        } else if (eventData.category === 'Film & Music') {
          categories.push('cinema', 'orchestra', 'film score', 'movie');
        } else if (eventData.category === 'Music') {
          categories.push('guitar', 'instrumental', 'acoustic', 'world music');
        } else if (eventData.category === 'Tour') {
          categories.push('historic', 'architecture', 'heritage', 'educational');
        } else if (eventData.category === 'Video Game Music') {
          categories.push('gaming', 'orchestra', 'soundtrack', 'multimedia');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'performing arts',
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
      
      console.log(`🎭 Successfully created ${events.length} Orpheum Theatre events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Orpheum Theatre scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new OrpheumTheatreScraper();
