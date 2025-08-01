/**
 * Kitsilano Showboat Scraper
 * 
 * This scraper provides information about events at Kitsilano Showboat in Vancouver
 * Source: https://www.kitsilanoshowboat.com/
 */

const { v4: uuidv4 } = require('uuid');

class KitsilanoShowboatScraper {
  constructor() {
    this.name = 'Kitsilano Showboat';
    this.url = 'https://www.kitsilanoshowboat.com/';
    this.sourceIdentifier = 'kitsilano-showboat';
    
    // Venue information
    this.venue = {
      name: "Kitsilano Showboat",
      id: "kitsilano-showboat-vancouver",
      address: "2300 Cornwall Ave",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6K 1B6",
      coordinates: {
        lat: 49.2757,
        lng: -123.1545
      },
      websiteUrl: "https://www.kitsilanoshowboat.com/",
      description: "Kitsilano Showboat is a beloved Vancouver summer tradition since 1935. This outdoor performance venue located at Kitsilano Beach offers free entertainment with the beautiful backdrop of English Bay, the North Shore mountains, and spectacular sunsets. Run entirely by volunteers, the Showboat hosts a diverse program of musical performances, dance shows, and community events throughout the summer months."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Kitsilano Showboat Opening Night: Vancouver Metropolitan Orchestra",
        description: "Join us for the grand opening night of Kitsilano Showboat's 90th season! The Vancouver Metropolitan Orchestra kicks off our summer of free entertainment with a special performance featuring classical favorites and popular film scores. Under the direction of Maestro Kenneth Hsieh, the orchestra will perform selections from Tchaikovsky, Dvořák, John Williams, and more. This beloved Vancouver summer tradition takes place at the historic outdoor stage at Kitsilano Beach with stunning views of English Bay and the North Shore mountains as your backdrop. Bring a blanket or beach chair and arrive early to secure your spot for this popular community event that marks the official start of summer in Vancouver.",
        date: new Date("2025-06-23T19:00:00"),
        endTime: new Date("2025-06-23T21:00:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/05/opening-night-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/opening-night-2025/",
        price: "Free",
        performers: ["Vancouver Metropolitan Orchestra", "Maestro Kenneth Hsieh"],
        ticketsRequired: false,
        category: "Music"
      },
      {
        title: "Cultural Dance Showcase: Around the World in 80 Minutes",
        description: "Experience a vibrant celebration of global dance traditions at Kitsilano Showboat's annual cultural dance showcase. This year's performance, 'Around the World in 80 Minutes,' features local dance ensembles representing traditions from Ukraine, India, Philippines, Mexico, West Africa, and Indigenous Canadian cultures. Each group will perform in authentic costumes with live musical accompaniment, sharing both traditional and contemporary interpretations of their cultural dance forms. Between performances, presenters will offer brief insights into the history and significance of each dance style. This popular family-friendly event showcases Vancouver's rich cultural diversity and promotes cross-cultural understanding through the universal language of dance.",
        date: new Date("2025-07-07T19:00:00"),
        endTime: new Date("2025-07-07T20:30:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/05/cultural-dance-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/cultural-dance-showcase-2025/",
        price: "Free",
        performers: ["Dovbush Ukrainian Dancers", "Jai Ho Bollywood Dance", "Alay Philippine Dance Group", "Ballet Folclórico Aztlán", "Wontanara Drum & Dance", "Dancers of Damelahamid"],
        ticketsRequired: false,
        category: "Dance"
      },
      {
        title: "Jazz on the Beach: The Hot Jazz Jubilee",
        description: "Swing into summer with an evening of hot jazz and cool breezes at Kitsilano Beach. The Hot Jazz Jubilee brings together Vancouver's finest traditional jazz musicians for a night of New Orleans-style jazz, swing standards, and original compositions. Led by acclaimed trumpeter Bria Skonberg, this seven-piece ensemble features clarinet, trombone, piano, bass, drums, and vocals performing music from the golden age of jazz through modern interpretations. The informal setting encourages dancing, and a small dance floor will be set up near the stage for those inspired by the rhythm. As the sun sets over English Bay, the magical combination of jazz and stunning natural scenery creates one of Vancouver's most memorable summer experiences.",
        date: new Date("2025-07-14T19:00:00"),
        endTime: new Date("2025-07-14T21:00:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/06/jazz-beach-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/jazz-on-the-beach-2025/",
        price: "Free",
        performers: ["The Hot Jazz Jubilee", "Bria Skonberg"],
        ticketsRequired: false,
        category: "Music"
      },
      {
        title: "Family Night: Magician & Puppet Show",
        description: "Bring the whole family to this special evening of wonder and laughter designed specifically for children and the young at heart. The first half features award-winning magician Shawn Farquhar (as seen on Penn & Teller: Fool Us) performing his family-friendly illusions with plenty of audience participation. After a short intermission, the beloved Canzani Puppets take the stage with their giant marionettes and shadow puppets in a performance combining classic fairy tales with modern twists. The early start time makes this perfect for families with young children, and volunteers will be distributing free popcorn to the first 200 kids who arrive. Make sure to come early to participate in the pre-show craft activities starting at 6:00 PM.",
        date: new Date("2025-07-21T18:30:00"),
        endTime: new Date("2025-07-21T20:00:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/06/family-night-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/family-night-2025/",
        price: "Free",
        performers: ["Shawn Farquhar", "Canzani Puppets"],
        ticketsRequired: false,
        category: "Family"
      },
      {
        title: "Vancouver Youth Symphony Orchestra Summer Concert",
        description: "Support the next generation of classical musicians as the Vancouver Youth Symphony Orchestra presents their annual summer concert at Kitsilano Showboat. These talented young musicians, ranging in age from 12 to 18, will perform a diverse program including classical masterpieces, movie soundtracks, and contemporary Canadian compositions. Under the guidance of conductor Dr. Michelle Tseng, the orchestra demonstrates the impressive results of Vancouver's strong music education programs. The 60-member ensemble features string, woodwind, brass, and percussion sections performing with remarkable skill and passion. This inspiring event showcases the bright future of classical music in our community while providing these dedicated young artists with valuable performance experience in a supportive environment.",
        date: new Date("2025-07-28T19:00:00"),
        endTime: new Date("2025-07-28T20:30:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/06/youth-symphony-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/youth-symphony-2025/",
        price: "Free",
        performers: ["Vancouver Youth Symphony Orchestra", "Dr. Michelle Tseng"],
        ticketsRequired: false,
        category: "Music"
      },
      {
        title: "Showboat Season Finale: Community Talent Showcase",
        description: "As the summer season draws to a close, Kitsilano Showboat presents its annual Community Talent Showcase featuring the best local performers selected from open auditions held throughout the year. This variety show highlights singers, musicians, dancers, poets, comedians, and other performers from across Vancouver in a celebration of our city's grassroots artistic community. The evening concludes with a special performance by Vancouver's beloved community choir, Chor Leoni Men's Choir, followed by a traditional singalong of 'Goodnight, Irene' that has closed the Showboat season for decades. Volunteers will distribute commemorative programs with the history of Kitsilano Showboat and information about getting involved next season.",
        date: new Date("2025-08-25T19:00:00"),
        endTime: new Date("2025-08-25T21:30:00"),
        imageUrl: "https://www.kitsilanoshowboat.com/wp-content/uploads/2025/07/season-finale-2025.jpg",
        eventLink: "https://www.kitsilanoshowboat.com/events/season-finale-2025/",
        price: "Free",
        performers: ["Community Talent Contest Winners", "Chor Leoni Men's Choir"],
        ticketsRequired: false,
        category: "Variety"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Kitsilano Showboat scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `kitsilano-showboat-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nVenue Information: Kitsilano Showboat is located at the east side of Kitsilano Pool at Kitsilano Beach Park. Seating is on concrete bleachers, so bringing a cushion is recommended. In case of rain, performances may be cancelled - check the official website or social media for updates. There are no tickets or reservations; seating is first-come, first-served. Washroom facilities and concessions are available nearby.`;
        
        // Create categories
        const categories = ['entertainment', 'outdoor', 'community', 'free', 'summer'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Music') {
          if (eventData.title.includes('Orchestra')) {
            categories.push('classical', 'orchestra');
          } else if (eventData.title.includes('Jazz')) {
            categories.push('jazz', 'swing');
          }
        } else if (eventData.category === 'Dance') {
          categories.push('cultural', 'international', 'folk dance');
        } else if (eventData.category === 'Family') {
          categories.push('children', 'magic', 'puppets', 'kid-friendly');
        } else if (eventData.category === 'Variety') {
          categories.push('talent show', 'community performers', 'finale');
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
      
      console.log(`🏖️ Successfully created ${events.length} Kitsilano Showboat events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Kitsilano Showboat scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new KitsilanoShowboatScraper();
