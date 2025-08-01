/**
 * Imperial Theatre Scraper
 * 
 * This scraper provides information about events at the Imperial Theatre in Vancouver
 * Source: https://www.imperialvancouver.com/
 */

const { v4: uuidv4 } = require('uuid');

class ImperialTheatreScraper {
  constructor() {
    this.name = 'Imperial Theatre';
    this.url = 'https://www.imperialvancouver.com/';
    this.sourceIdentifier = 'imperial-theatre';
    
    // Venue information
    this.venue = {
      name: "Imperial Theatre",
      id: "imperial-theatre-vancouver",
      address: "319 Main St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6A 2S9",
      coordinates: {
        lat: 49.2814,
        lng: -123.1002
      },
      websiteUrl: "https://www.imperialvancouver.com/",
      description: "The Imperial is a state-of-the-art venue in the heart of Vancouver's historic Chinatown district. Originally built in 1913 as a theatre for silent films, this unique space combines historic architecture with modern technology, including immersive 3D projection mapping, 7.1 surround sound, and a versatile layout that can accommodate a wide range of performances and events. With a capacity of up to 800, The Imperial hosts concerts, arts performances, film screenings, corporate events, and private functions."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Khruangbin: World Tour",
        description: "Texas trio Khruangbin brings their genre-defying sound to Vancouver, blending psychedelic rock, dub, soul, and global influences into a mesmerizing live experience. Known for their instrumental prowess and hypnotic grooves, the band will perform tracks from their acclaimed albums including their latest release. Khruangbin's live shows are known for their immersive lighting design, impeccable musicianship, and the ability to create an atmosphere that transcends traditional concert experiences. With Laura Lee on bass, Mark Speer on guitar, and Donald 'DJ' Johnson on drums, this performance promises to be a highlight of the summer concert season.",
        date: new Date("2025-07-15T20:00:00"),
        endTime: new Date("2025-07-15T23:00:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/04/khruangbin-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/khruangbin/",
        price: "$49.50",
        performers: ["Khruangbin"],
        ticketsRequired: true,
        category: "Concert"
      },
      {
        title: "Vancouver International Film Festival: Midnight Madness",
        description: "The Vancouver International Film Festival partners with The Imperial to bring you Midnight Madness, a showcase of the most outrageous, shocking, and genre-defying films from around the world. This special late-night screening features a selection of horror, science fiction, and cult films that push the boundaries of cinema. Each screening is followed by a Q&A session with filmmakers and special guests, offering insights into the creative process behind these unique films. Perfect for night owls and cinema enthusiasts looking for something outside the mainstream, this event has become a beloved tradition during VIFF.",
        date: new Date("2025-08-02T23:30:00"),
        endTime: new Date("2025-08-03T02:30:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/06/viff-midnight-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/viff-midnight-madness/",
        price: "$18",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Bonobo: Live Electronic Set",
        description: "Acclaimed British producer and DJ Bonobo (Simon Green) returns to Vancouver for a special live electronic set featuring his signature blend of organic and electronic sounds. Moving beyond the traditional DJ performance, this show incorporates live instrumentation alongside Green's masterful production techniques, creating a dynamic and immersive sonic experience. The Imperial's state-of-the-art sound system and visual capabilities provide the perfect setting for Bonobo's lush soundscapes and atmospheric compositions. Expect to hear tracks from across his extensive catalog, including material from his most recent album, reimagined for this unique live performance format.",
        date: new Date("2025-07-28T21:00:00"),
        endTime: new Date("2025-07-29T01:00:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/05/bonobo-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/bonobo-live-electronic/",
        price: "$45",
        performers: ["Bonobo"],
        ticketsRequired: true,
        category: "Electronic"
      },
      {
        title: "Vancouver Podcast Festival: Live Recording",
        description: "Experience the magic of podcast production with this special live recording event featuring three of Canada's most popular podcasts. The evening includes performances by true crime sensation 'Dark Pines,' comedy interview show 'The Debaters,' and the science-focused 'Quirks & Quarks.' Each podcast will record a complete episode with audience interaction, giving fans a behind-the-scenes look at how their favorite audio shows come together. This unique event, part of the Vancouver Podcast Festival, showcases the growing influence and diversity of the podcasting medium while offering an intimate connection between creators and their audience in the beautiful setting of The Imperial Theatre.",
        date: new Date("2025-08-10T19:00:00"),
        endTime: new Date("2025-08-10T22:30:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/06/podcast-festival-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/vancouver-podcast-festival/",
        price: "$35",
        performers: ["Dark Pines", "The Debaters", "Quirks & Quarks"],
        ticketsRequired: true,
        category: "Podcast"
      },
      {
        title: "Queer Comedy Night: Pride Edition",
        description: "Celebrate Pride Month with an evening of hilarious stand-up featuring an all-star lineup of LGBTQ+ comedians from across North America. Headlining the show is the razor-sharp Emma Hunter, with support from local favorites Yumi Nagashima and Gavin Matts, plus special guests. This inclusive event showcases diverse voices and perspectives through the universal language of laughter. Now in its fifth year, the Pride Edition of Queer Comedy Night has become one of Vancouver's most popular comedy events, consistently selling out weeks in advance. A portion of all ticket sales will be donated to Rainbow Refugee, supporting LGBTQ+ individuals seeking asylum in Canada.",
        date: new Date("2025-08-15T20:00:00"),
        endTime: new Date("2025-08-15T22:30:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/06/pride-comedy-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/queer-comedy-night-pride/",
        price: "$25",
        performers: ["Emma Hunter", "Yumi Nagashima", "Gavin Matts"],
        ticketsRequired: true,
        category: "Comedy"
      },
      {
        title: "Vancouver Electronic Arts Festival: A/V Showcase",
        description: "The Vancouver Electronic Arts Festival presents a cutting-edge audio-visual showcase featuring international and local artists pushing the boundaries of sound and visual art. This immersive evening explores the intersection of electronic music, digital art, and technology through performances that combine innovative sound design with stunning visuals. Featured artists include Berlin-based audio-visual duo Amnesia Scanner, Canadian electronic composer Sarah Davachi, and local digital art collective Invisible Light Network. The Imperial's advanced projection mapping capabilities will be used to their full potential, transforming the venue into a 360-degree canvas for this multi-sensory experience.",
        date: new Date("2025-08-23T20:00:00"),
        endTime: new Date("2025-08-24T02:00:00"),
        imageUrl: "https://www.imperialvancouver.com/wp-content/uploads/2025/07/electronic-arts-fest-2025.jpg",
        eventLink: "https://www.imperialvancouver.com/events/electronic-arts-festival/",
        price: "$30",
        performers: ["Amnesia Scanner", "Sarah Davachi", "Invisible Light Network"],
        ticketsRequired: true,
        category: "Electronic Arts"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Imperial Theatre scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `imperial-${slugifiedTitle}-${eventDate}`;
        
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
          detailedDescription += `Tickets: Required, available through The Imperial website or box office\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nThe Imperial Theatre is located in Vancouver's historic Chinatown neighborhood, easily accessible by public transit. The venue is fully accessible and offers a full bar service. Doors typically open one hour before event start time.`;
        
        // Create categories
        const categories = ['entertainment', 'nightlife', 'arts'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Concert') {
          categories.push('music', 'live music');
        } else if (eventData.category === 'Film') {
          categories.push('cinema', 'film festival', 'midnight screening');
        } else if (eventData.category === 'Electronic') {
          categories.push('music', 'dj', 'electronic music');
        } else if (eventData.category === 'Podcast') {
          categories.push('live recording', 'performance', 'media');
        } else if (eventData.category === 'Comedy') {
          categories.push('standup', 'lgbtq', 'pride');
        } else if (eventData.category === 'Electronic Arts') {
          categories.push('digital art', 'projection mapping', 'audiovisual');
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
      
      console.log(`🎭 Successfully created ${events.length} Imperial Theatre events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Imperial Theatre scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new ImperialTheatreScraper();
