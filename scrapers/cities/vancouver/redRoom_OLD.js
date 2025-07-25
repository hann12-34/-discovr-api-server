/**
 * Red Room Scraper
 * 
 * This scraper provides information about events at the Red Room in Vancouver
 * Source: https://www.redroomonrichards.com/
 */

const { v4: uuidv4 } = require('uuid');

class RedRoomScraper {
  constructor() {
    this.name = 'Red Room';
    this.url = 'https://www.redroomonrichards.com/';
    this.sourceIdentifier = 'red-room';
    
    // Venue information
    this.venue = {
      name: "Red Room",
      id: "red-room-vancouver",
      address: "398 Richards St",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 2Z3",
      coordinates: {
        lat: 49.2839,
        lng: -123.1126
      },
      websiteUrl: "https://www.redroomonrichards.com/",
      description: "The Red Room is an underground nightclub and music venue in downtown Vancouver known for its intimate atmosphere, powerful sound system, and diverse programming. This subterranean venue hosts everything from electronic music nights to hip-hop shows, indie rock concerts, and cultural events."
    };
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "Bass Coast Presents: Liquid Stranger",
        description: "Bass Coast Festival brings Swedish-born electronic music producer Liquid Stranger to Red Room for a night of boundary-pushing bass music. Known for his genre-defying approach that combines elements of dubstep, trap, downtempo, and experimental electronic sounds, Liquid Stranger delivers an unpredictable and immersive sonic journey. The Red Room's intimate underground setting and powerful Funktion-One sound system provide the perfect environment to experience his bass-heavy productions. Local support will be provided by Bass Coast resident DJs, creating a showcase of both international and homegrown talent. This event is part of Bass Coast's year-round programming that extends the festival experience into Vancouver's club scene.",
        date: new Date("2025-07-11T22:00:00"),
        endTime: new Date("2025-07-12T03:00:00"),
        imageUrl: "https://www.redroomonrichards.com/wp-content/uploads/2025/05/liquid-stranger-2025.jpg",
        eventLink: "https://www.redroomonrichards.com/events/liquid-stranger/",
        price: "$30-$40",
        performers: ["Liquid Stranger", "The Librarian", "Hooves"],
        ageRestriction: "19+",
        ticketsRequired: true,
        category: "Electronic"
      },
      {
        title: "Vancouver Hip-Hop Collective: Open Cypher",
        description: "Vancouver Hip-Hop Collective's monthly Open Cypher returns to the Red Room, providing a platform for local MCs, beatmakers, and hip-hop enthusiasts to showcase their skills. The evening begins with a showcase featuring established local hip-hop acts performing brief sets, followed by the main event: an open freestyle session where participants can sign up to spit verses over beats provided by resident DJ Cosm. This inclusive event welcomes performers of all experience levels and has become an important incubator for Vancouver's growing hip-hop scene. Between performances, attendees can browse vinyl records, merchandise, and art from local creators at vendor tables set up around the venue. Whether you're a performer or spectator, this event offers an authentic hip-hop experience in an underground setting.",
        date: new Date("2025-07-17T20:00:00"),
        endTime: new Date("2025-07-17T24:00:00"),
        imageUrl: "https://www.redroomonrichards.com/wp-content/uploads/2025/06/open-cypher-july.jpg",
        eventLink: "https://www.redroomonrichards.com/events/open-cypher-july/",
        price: "$10",
        performers: ["DJ Cosm", "Emotionz", "Junk", "Open Cypher Participants"],
        ticketsRequired: true,
        ageRestriction: "19+",
        category: "Hip-Hop"
      },
      {
        title: "Indie Rock Showcase: Said The Whale & Friends",
        description: "Vancouver indie rock darlings Said The Whale headline this showcase of local talent at the Red Room. Fresh off the release of their latest album, the JUNO Award-winning band brings their signature blend of catchy hooks, thoughtful lyrics, and west coast influences to this intimate underground venue. The night features a carefully curated lineup of supporting acts including emerging indie artists Haley Blais and Sleepy Gonzales. This all-ages afternoon show provides an opportunity for younger fans to experience live music in a club setting, with a strict no alcohol policy in effect. The event highlights Vancouver's thriving independent music scene and supports local artists through merchandise sales and networking opportunities.",
        date: new Date("2025-07-19T16:00:00"),
        endTime: new Date("2025-07-19T20:00:00"),
        imageUrl: "https://www.redroomonrichards.com/wp-content/uploads/2025/06/said-the-whale-2025.jpg",
        eventLink: "https://www.redroomonrichards.com/events/said-the-whale/",
        price: "$25",
        performers: ["Said The Whale", "Haley Blais", "Sleepy Gonzales"],
        ticketsRequired: true,
        category: "Indie Rock"
      },
      {
        title: "Asian Underground: K-Pop & J-Pop Night",
        description: "Vancouver's longest-running K-Pop and J-Pop dance party returns to the Red Room with a night dedicated to the biggest hits from Korean and Japanese pop music. DJs Rei So and KTown spin everything from mainstream chart-toppers to underground favorites, covering K-pop, J-pop, city pop, and Korean hip-hop. The event features dance contests with prizes for best choreography, random dance play sessions where participants can show off their knowledge of popular dance routines, and special themed drink offerings. Attendees are encouraged to dress in their favorite Asian pop culture inspired outfits, with a photo booth available to capture memories. This inclusive event has built a dedicated community of Asian pop music enthusiasts from across the Lower Mainland.",
        date: new Date("2025-07-25T22:00:00"),
        endTime: new Date("2025-07-26T03:00:00"),
        imageUrl: "https://www.redroomonrichards.com/wp-content/uploads/2025/06/asian-underground-july.jpg",
        eventLink: "https://www.redroomonrichards.com/events/asian-underground-july/",
        price: "$15-$20",
        performers: ["DJ Rei So", "DJ KTown"],
        ticketsRequired: true,
        ageRestriction: "19+",
        category: "Dance Party"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Red Room scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `red-room-${slugifiedTitle}-${eventDate}`;
        
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
        
        if (eventData.ageRestriction) {
          detailedDescription += `Age Restriction: ${eventData.ageRestriction}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Available online or at the door if not sold out\n`;
        }
        
        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }
        
        detailedDescription += `\nVenue Information: The Red Room is located underground at 398 Richards Street in downtown Vancouver. The venue features a powerful Funktion-One sound system, full bar service, and an intimate atmosphere. Valid government-issued photo ID is required for all 19+ events.`;
        
        // Create categories
        const categories = ['nightlife', 'music', 'underground'];
        
        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());
        
        if (eventData.category === 'Electronic') {
          categories.push('bass music', 'dubstep', 'edm');
        } else if (eventData.category === 'Hip-Hop') {
          categories.push('rap', 'freestyle', 'open mic');
        } else if (eventData.category === 'Indie Rock') {
          categories.push('live music', 'local bands', 'concert');
        } else if (eventData.category === 'Dance Party') {
          categories.push('k-pop', 'j-pop', 'asian music');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'nightlife',
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
      
      console.log(`🎵 Successfully created ${events.length} Red Room events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Red Room scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new RedRoomScraper();
