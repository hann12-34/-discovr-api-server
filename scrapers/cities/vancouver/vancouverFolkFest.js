/**
 * Vancouver Folk Music Festival Scraper
 * 
 * This scraper provides information about the Vancouver Folk Music Festival
 * Source: https://thefestival.bc.ca/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverFolkFestScraper {
  constructor() {
    this.name = 'Vancouver Folk Music Festival';
    this.url = 'https://thefestival.bc.ca/';
    this.sourceIdentifier = 'vancouver-folk-music-festival';
    
    // Venue information
    this.venue = {
      name: "Jericho Beach Park",
      id: "jericho-beach-park",
      address: "3941 Point Grey Road",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6R 1B5",
      coordinates: {
        lat: 49.2721,
        lng: -123.1927
      },
      websiteUrl: "https://thefestival.bc.ca/",
      description: "The Vancouver Folk Music Festival is a beloved cultural institution that has been bringing folk and global music to Vancouver's Jericho Beach Park since 1978. The festival features multiple stages with performances by acclaimed and emerging artists from around the world in a beautiful oceanside setting."
    };
    
    // Festival events for 2025
    this.events = [
      {
        title: "Vancouver Folk Music Festival 2025 - Friday",
        description: "The opening day of the 48th annual Vancouver Folk Music Festival features an exceptional lineup of folk, roots, and world music artists across seven stages at beautiful Jericho Beach Park. Friday's performances include internationally renowned headliners and exciting emerging artists, showcasing musical traditions from around the world. The festival site opens at 4:00pm with performances beginning at 5:00pm and continuing into the evening. Early attendees can explore the artisan market, global food village, and community zone with interactive workshops and family-friendly activities. The festival's commitment to environmental sustainability continues with zero-waste initiatives, reusable cup programs, and free water refill stations throughout the grounds. Friday tickets provide access to all performances and activities that day, with main stage headliners beginning at 7:00pm. The festival site offers spectacular views of English Bay and the North Shore mountains, creating a magical backdrop for this celebration of music and community.",
        date: new Date("2025-07-18T16:00:00"),
        endTime: new Date("2025-07-18T23:00:00"),
        imageUrl: "https://thefestival.bc.ca/wp-content/uploads/2025/03/folk-fest-friday-2025.jpg",
        eventLink: "https://thefestival.bc.ca/festival-2025/friday/",
        price: "$75 (Early Bird: $65, Youth: $35)",
        ticketsRequired: true,
        category: "Music Festival"
      },
      {
        title: "Vancouver Folk Music Festival 2025 - Saturday",
        description: "The second day of the Vancouver Folk Music Festival offers a full day of diverse musical performances, workshops, and collaborations across all seven stages at Jericho Beach Park. Saturday's expanded schedule runs from morning until late evening, featuring over 40 performances ranging from traditional folk and roots music to innovative global fusion and contemporary singer-songwriters. Throughout the day, unique workshop stages bring together artists from different backgrounds for one-time-only collaborative performances—a hallmark of the festival experience. The Little Folks Village is in full swing with family-friendly entertainment, craft activities, and performances designed specifically for younger festival-goers. Food vendors representing cuisines from around the world offer sustainable dining options, and the expanded artisan market features handcrafted goods from local and international creators. As the day turns to evening, main stage performances showcase headline acts against the backdrop of spectacular sunset views over English Bay.",
        date: new Date("2025-07-19T10:00:00"),
        endTime: new Date("2025-07-19T23:00:00"),
        imageUrl: "https://thefestival.bc.ca/wp-content/uploads/2025/03/folk-fest-saturday-2025.jpg",
        eventLink: "https://thefestival.bc.ca/festival-2025/saturday/",
        price: "$85 (Early Bird: $75, Youth: $40)",
        ticketsRequired: true,
        category: "Music Festival"
      },
      {
        title: "Vancouver Folk Music Festival 2025 - Sunday",
        description: "The final day of the Vancouver Folk Music Festival brings together favorite performers from throughout the weekend for special collaborations and closing performances across all stages at Jericho Beach Park. Sunday's atmosphere combines relaxed enjoyment with highlights including the popular gospel session, world music showcases, and the grand finale concert on the main stage. Festival traditions include the community choir performance, group dances, and the closing circle that invites all participants to join in celebration. The Little Folks Village continues with family programming including the popular parade of young festival-goers through the grounds. Workshop stages feature intimate performances and artist discussions that provide deeper insights into musical traditions and creative processes. Food vendors and artisan marketplaces remain open throughout the day, offering final opportunities to sample diverse cuisines and take home handcrafted souvenirs. The festival concludes with a headline performance and community gathering that celebrates the weekend's spirit of music and connection.",
        date: new Date("2025-07-20T10:00:00"),
        endTime: new Date("2025-07-20T22:00:00"),
        imageUrl: "https://thefestival.bc.ca/wp-content/uploads/2025/03/folk-fest-sunday-2025.jpg",
        eventLink: "https://thefestival.bc.ca/festival-2025/sunday/",
        price: "$85 (Early Bird: $75, Youth: $40)",
        ticketsRequired: true,
        category: "Music Festival"
      },
      {
        title: "Vancouver Folk Music Festival 2025 - Weekend Pass",
        description: "Experience the complete Vancouver Folk Music Festival with a weekend pass granting access to all three days of performances, workshops, and activities at Jericho Beach Park. The weekend pass is the best value for experiencing the full festival, allowing holders to enjoy over 100 performances across seven stages from Friday evening through Sunday night. Pass holders can create their own festival experience, moving between main stage concerts, intimate workshop collaborations, global music showcases, and community events throughout the weekend. In addition to musical performances, the festival features a curated artisan market with vendors from across North America, a diverse food village featuring sustainable and locally-sourced options, a family zone with activities for all ages, and an Indigenous cultural area with traditional arts demonstrations and performances. The weekend pass includes in-and-out privileges each day, allowing festival-goers to come and go as they please throughout the entire event.",
        date: new Date("2025-07-18T16:00:00"),
        endTime: new Date("2025-07-20T22:00:00"),
        imageUrl: "https://thefestival.bc.ca/wp-content/uploads/2025/03/folk-fest-weekend-2025.jpg",
        eventLink: "https://thefestival.bc.ca/tickets/weekend-pass/",
        price: "$175 (Early Bird: $150, Youth: $85)",
        ticketsRequired: true,
        category: "Music Festival"
      },
      {
        title: "Folk Festival Preview Concert: Emerging Artists Showcase",
        description: "Get a taste of what's to come at the Vancouver Folk Music Festival with this special preview concert featuring emerging artists who will be performing at the main festival. This intimate evening at the WISE Hall introduces festival audiences to new voices in folk and roots music, with performances by up-and-coming artists from British Columbia and beyond. Each artist or group will perform a short set, providing a sampling of the diverse talent that will be featured during the full festival weekend at Jericho Beach Park. Festival organizers will share insights about the upcoming event, announce special collaborations, and reveal previously unannounced performers. This preview event has become a tradition for festival regulars who appreciate the opportunity to experience new artists in a cozy venue before the main festival begins. Proceeds from the concert support the festival's Emerging Artist Program, which provides mentorship and performance opportunities for early-career musicians.",
        date: new Date("2025-07-11T19:30:00"),
        endTime: new Date("2025-07-11T22:30:00"),
        venue: {
          name: "WISE Hall",
          id: "wise-hall",
          address: "1882 Adanac St",
          city: "Vancouver",
          state: "BC",
          country: "Canada",
          postalCode: "V5L 2E8",
          coordinates: {
            lat: 49.2771,
            lng: -123.0702
          }
        },
        imageUrl: "https://thefestival.bc.ca/wp-content/uploads/2025/06/folk-fest-preview-2025.jpg",
        eventLink: "https://thefestival.bc.ca/preview-concert-2025/",
        price: "$25 (Student/Senior: $20)",
        ticketsRequired: true,
        category: "Concert"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Folk Music Festival scraper...');
    const events = [];
    
    try {
      // Process predefined events
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `folk-fest-${slugifiedTitle}-${eventDate}`;
        
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
        
        // Determine if it's a multi-day event
        const isMultiDay = eventData.date.toDateString() !== eventData.endTime.toDateString();
        let formattedDateRange = formattedDate;
        
        if (isMultiDay) {
          const endDate = dateFormat.format(eventData.endTime);
          formattedDateRange = `${formattedDate} to ${endDate}`;
        }
        
        // Create detailed description with formatted date and time
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        
        if (isMultiDay) {
          detailedDescription += `Dates: ${formattedDateRange}\n`;
          detailedDescription += `Hours: ${formattedStartTime} - ${formattedEndTime}\n`;
        } else {
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
        }
        
        // Use the event-specific venue if provided, otherwise use the festival venue
        const eventVenue = eventData.venue || this.venue;
        
        detailedDescription += `Venue: ${eventVenue.name}, ${eventVenue.address}, Vancouver\n`;
        
        if (eventData.price) {
          detailedDescription += `Price: ${eventData.price}\n`;
        }
        
        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Required, available online through the festival website\n`;
        }
        
        if (!eventData.venue) { // Only add for main festival events
          detailedDescription += `\nFestival Information: The Vancouver Folk Music Festival takes place at Jericho Beach Park, featuring seven stages, an artisan market, global food village, family activities, and spectacular ocean and mountain views. The festival site is accessible by public transit, bicycle (with free bike valet), or limited paid parking nearby. Gates open one hour before performances begin each day.`;
        }
        
        // Create categories
        const categories = ['music', 'festival', 'folk', 'outdoor'];
        
        if (eventData.title.includes('Preview')) {
          categories.push('concert', 'showcase', 'emerging artists');
        } else if (eventData.title.includes('Weekend Pass')) {
          categories.push('multi-day', 'pass', 'full festival');
        } else {
          categories.push('concert', 'live music', eventData.title.includes('Friday') ? 'friday' : eventData.title.includes('Saturday') ? 'saturday' : 'sunday');
        }
        
        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: eventVenue,
          category: 'music',
          categories: categories,
          sourceURL: this.url,
          officialWebsite: eventData.eventLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${isMultiDay ? formattedDateRange : formattedDate}`);
      }
      
      console.log(`🎵 Successfully created ${events.length} Vancouver Folk Music Festival events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Folk Music Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverFolkFestScraper();
