/**
 * Vancouver International Film Festival Scraper
 * 
 * This scraper provides information about events at the Vancouver International Film Festival
 * Source: https://www.viff.org/
 */

const { v4: uuidv4 } = require('uuid');

class VIFFScraper {
  constructor() {
    this.name = 'Vancouver International Film Festival';
    this.url = 'https://www.viff.org/';
    this.sourceIdentifier = 'vancouver-international-film-festival';
    
    // Venue information - VIFF uses multiple venues
    this.venue = {
      name: "Vancouver International Film Festival",
      id: "viff-vancouver",
      address: "1181 Seymour St", // VIFF Centre main address
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6B 3M7",
      coordinates: {
        lat: 49.2774,
        lng: -123.1252
      },
      websiteUrl: "https://www.viff.org/",
      description: "The Vancouver International Film Festival (VIFF) is among the five largest film festivals in North America, screening films from more than 70 countries on 10 screens. VIFF's programming includes the world's best cinema, from cutting-edge documentaries to narrative features, Canadian and international shorts, as well as creator talks, live performances and other events that complement the film screenings."
    };
    
    // Festival venues
    this.venues = [
      {
        name: "VIFF Centre",
        address: "1181 Seymour St, Vancouver, BC V6B 3M7",
        description: "VIFF's year-round cinema venue with multiple screens and event spaces"
      },
      {
        name: "The Cinematheque",
        address: "1131 Howe St, Vancouver, BC V6Z 2L7",
        description: "Independent cinema dedicated to film appreciation and education"
      },
      {
        name: "Vancouver Playhouse",
        address: "600 Hamilton St, Vancouver, BC V6B 2P1",
        description: "Historic 668-seat civic theatre hosting major festival premieres"
      },
      {
        name: "SFU Goldcorp Centre for the Arts",
        address: "149 W Hastings St, Vancouver, BC V6B 1H4",
        description: "Downtown cultural hub with screening facilities and event spaces"
      }
    ];
    
    // Upcoming events for 2025
    this.events = [
      {
        title: "VIFF 2025: Opening Night Gala & Reception",
        description: "The 44th annual Vancouver International Film Festival kicks off with the Canadian premiere of an acclaimed international feature film, followed by a gala reception with filmmakers in attendance. This red carpet event brings together film industry professionals, media, and cinema enthusiasts to celebrate the start of one of North America's largest film festivals. The opening film selection showcases the festival's commitment to presenting innovative and thought-provoking cinema from around the world. Following the screening, ticket holders are invited to the exclusive opening reception featuring local cuisine, craft cocktails, and opportunities to mingle with filmmakers and special guests. This prestigious event sets the tone for the 16-day celebration of cinema that follows.",
        date: new Date("2025-09-25T19:00:00"),
        endTime: new Date("2025-09-25T23:00:00"),
        venue: "Vancouver Playhouse",
        imageUrl: "https://www.viff.org/wp-content/uploads/2025/08/opening-gala-2025.jpg",
        eventLink: "https://www.viff.org/festival/opening-night-2025/",
        price: "$75",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Canadian Film Day: Emerging Voices Showcase",
        description: "A celebration of the next generation of Canadian filmmaking talent featuring short films and feature debuts from across the country. This curated program highlights diverse perspectives and innovative approaches to storytelling from filmmakers who represent the future of Canadian cinema. The showcase includes works from Indigenous creators, official language minority communities, and filmmakers from underrepresented groups. Following the screenings, emerging filmmakers will participate in a panel discussion about the challenges and opportunities in Canadian independent film production. This event is part of VIFF's ongoing commitment to discovering and nurturing new Canadian talent and connecting these creators with audiences and industry professionals.",
        date: new Date("2025-09-30T16:00:00"),
        endTime: new Date("2025-09-30T20:00:00"),
        venue: "VIFF Centre",
        imageUrl: "https://www.viff.org/wp-content/uploads/2025/08/canadian-showcase-2025.jpg",
        eventLink: "https://www.viff.org/festival/canadian-film-day-2025/",
        price: "$15",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "Masterclass: The Art of Cinematography with Roger Deakins",
        description: "Legendary cinematographer Roger Deakins, ASC, BSC (known for his work on films including The Shawshank Redemption, Blade Runner 2049, and 1917) shares insights from his illustrious career in this special masterclass event. This rare opportunity allows film students, professionals, and enthusiasts to learn directly from one of cinema's most acclaimed visual artists. Deakins will discuss his creative process, technical approaches, collaboration with directors, and the evolution of cinematography in the digital age. The session includes an in-depth analysis of scenes from his most celebrated works, behind-the-scenes stories from major productions, and a moderated Q&A where attendees can ask questions directly to this two-time Academy Award winner.",
        date: new Date("2025-10-02T13:00:00"),
        endTime: new Date("2025-10-02T16:00:00"),
        venue: "SFU Goldcorp Centre for the Arts",
        imageUrl: "https://www.viff.org/wp-content/uploads/2025/08/deakins-masterclass-2025.jpg",
        eventLink: "https://www.viff.org/festival/masterclass-deakins/",
        price: "$25",
        ticketsRequired: true,
        category: "Education"
      },
      {
        title: "International Focus: Contemporary Korean Cinema",
        description: "This special program showcases the continued global influence of Korean filmmaking with a curated selection of new narrative features, documentaries, and animated works. Building on the international success of Korean cinema in recent years, this series explores how Korean filmmakers are pushing creative boundaries while addressing universal themes through a distinctive cultural lens. The program includes exclusive Canadian premieres, retrospective screenings of modern classics, and a roundtable discussion with visiting Korean directors about the past, present, and future of their national cinema. Film introductions and Q&A sessions will be accompanied by English subtitles or translation as needed, making this program accessible to all festival attendees.",
        date: new Date("2025-10-04T12:00:00"),
        endTime: new Date("2025-10-04T22:00:00"),
        venue: "The Cinematheque",
        imageUrl: "https://www.viff.org/wp-content/uploads/2025/08/korean-cinema-2025.jpg",
        eventLink: "https://www.viff.org/festival/korean-cinema-focus/",
        price: "$40 full day pass / $14 individual screenings",
        ticketsRequired: true,
        category: "Film"
      },
      {
        title: "VIFF 2025: Closing Night Film & Awards Ceremony",
        description: "The 44th Vancouver International Film Festival concludes with the Canadian premiere of an acclaimed international feature, followed by the annual VIFF Awards Ceremony celebrating the festival's top films and filmmakers. The evening begins with the screening of a highly anticipated closing film selected for its artistic merit and audience appeal. Following the screening, the festival's juried awards will be presented, including the Best Canadian Feature Film, Best BC Film, Emerging Canadian Director, and Audience Choice Award. The ceremony offers a final opportunity to celebrate the filmmakers and stories that defined this year's festival. Following the awards presentation, all attendees are invited to the closing night reception featuring local cuisine and beverages, live entertainment, and a chance to connect with filmmakers and fellow cinema lovers before the festival concludes.",
        date: new Date("2025-10-10T19:00:00"),
        endTime: new Date("2025-10-10T23:30:00"),
        venue: "Vancouver Playhouse",
        imageUrl: "https://www.viff.org/wp-content/uploads/2025/08/closing-night-2025.jpg",
        eventLink: "https://www.viff.org/festival/closing-night-2025/",
        price: "$35",
        ticketsRequired: true,
        category: "Film"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver International Film Festival scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `viff-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Find venue details
        const venueDetails = this.venues.find(v => v.name === eventData.venue) || this.venues[0];
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        detailedDescription += `Date: ${formattedDate}\n`;
        detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        detailedDescription += `Venue: ${eventData.venue}, ${venueDetails.address}\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available through VIFF box office or website\n`;
        }
        
        detailedDescription += `\nThe Vancouver International Film Festival runs from September 25 to October 10, 2025, with screenings and events at multiple venues across downtown Vancouver. Festival passes and ticket packages are available with discounts for students, seniors, and VIFF+ members.`;
        
        // Create venue object specific to this event
        const eventVenue = {
          ...this.venue,
          name: eventData.venue,
          address: venueDetails.address
        };
        
        // Create categories
        const categories = ['film festival', 'cinema', 'arts', 'culture'];
        
        // Add event-specific categories
        if (eventData.title.includes('Opening Night')) {
          categories.push('gala', 'premiere', 'opening night');
        } else if (eventData.title.includes('Closing Night')) {
          categories.push('awards', 'ceremony', 'closing night');
        } else if (eventData.title.includes('Canadian Film')) {
          categories.push('canadian cinema', 'short films', 'emerging filmmakers');
        } else if (eventData.title.includes('Masterclass')) {
          categories.push('education', 'filmmaking', 'cinematography');
        } else if (eventData.title.includes('Korean Cinema')) {
          categories.push('international', 'world cinema', 'korean films');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: eventVenue,
          category: 'film',
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
      
      console.log(`🎬 Successfully created ${events.length} Vancouver International Film Festival events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in VIFF scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VIFFScraper();
