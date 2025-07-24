/**
 * Yaletown Jazz Scraper
 * 
 * This scraper generates events for the "Let's Hear It For Yaletown" Jazz series
 * running from June 4 to July 17, 2025 at Bill Curtis Square
 */

const { v4: uuidv4 } = require('uuid');

class YaletownJazzScraper {
  constructor() {
    this.name = 'Yaletown Jazz';
    this.url = 'https://yaletowninfo.com/whats-happening/music/jazz/';
    this.sourceIdentifier = 'yaletown-jazz';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Bill Curtis Square',
      id: 'bill-curtis-square',
      address: '1198 Mainland St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 5P2',
      coordinates: {
        lat: 49.274753,
        lng: -123.121150
      },
      websiteUrl: 'https://yaletowninfo.com/whats-happening/music/',
      description: "Bill Curtis Square is an outdoor public space located in the heart of Vancouver's Yaletown district, behind the Yaletown-Roundhouse Station. The square regularly hosts community events, concerts, and performances, and features the historic Engine 374, which pulled the first transcontinental passenger train into Vancouver."
    };
    
    // Series description
    this.seriesDescription = "Enjoy talented local jazz bands and exciting swing dancing performances by the Vancity Hot Jazz Society. Experience the magic of live Canadian music, from New Orleans trad jazz to soulful gospel, as the outdoor square comes alive with infectious rhythms. Part of the 'Let's Hear It For Yaletown' summer music series featuring free outdoor performances curated by local non-profit organizations.";
    
    // Events schedule (contains all performances)
    this.events = [
      {
        date: '2025-06-04',
        performer: "Ben MacRae's Grand Slam",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Ben MacRae's Grand Slam brings lively jazz to Bill Curtis Square as part of the Yaletown Jazz series. Enjoy this free outdoor performance of energetic and engaging jazz music in the heart of Yaletown."
      },
      {
        date: '2025-06-05',
        performer: "Tom Arntzen and The Aviators",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Tom Arntzen and The Aviators deliver a high-flying jazz experience at Bill Curtis Square. This free outdoor concert features exceptional musicianship and classic jazz standards reimagined."
      },
      {
        date: '2025-06-06',
        performer: "Tim Sars Quintet",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Tim Sars Quintet brings their distinctive jazz sound to Yaletown's outdoor stage. Known for their energetic performances and innovative arrangements, this free concert promises to be a highlight of the series."
      },
      {
        date: '2025-06-11',
        performer: "White Rock Rhythm Kings",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The White Rock Rhythm Kings bring their signature New Orleans-style jazz to the Yaletown Jazz series. Their authentic sound and spirited performance make for a perfect summer evening of free outdoor music."
      },
      {
        date: '2025-06-12',
        performer: "The Lawless Firm",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Lawless Firm delivers a captivating blend of jazz styles at Bill Curtis Square. This free outdoor concert features sophisticated harmonies and improvisational prowess that jazz aficionados will appreciate."
      },
      {
        date: '2025-06-13',
        performer: "Brad Shigeta's Swingtime Band",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Brad Shigeta's Swingtime Band brings the golden age of swing to Yaletown with their authentic renditions of classic swing era tunes. This free concert is perfect for both listening and dancing."
      },
      {
        date: '2025-06-18',
        performer: "Casey Thomas-Burns Swing Band",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Casey Thomas-Burns Swing Band performs energetic swing jazz at Bill Curtis Square. Their dynamic sound and rhythm make for an engaging free outdoor concert in the heart of Yaletown."
      },
      {
        date: '2025-06-19',
        performer: "Terminal City Brass Band",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Terminal City Brass Band plays a full-on range from Traditional to Funk and anything else that crosses their minds. These close friends, together since 2016, create a unique sound that spans multiple jazz genres in this free outdoor performance."
      },
      {
        date: '2025-06-20',
        performer: "Lache Cercel & the Roma Jazz Ensemble",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: true,
        rescheduleDate: '2025-07-17',
        description: "Lache Cercel & the Roma Jazz Ensemble create dialogue between musical cultures with their unique Roma Jazz style. World-renowned violinist and composer Lache Cercel, along with Don Ogilvie, Kyle Hagen, Paul Townsend and Laura Crema, provide an experience of peace, joy, and harmony. Note: This event has been rescheduled to July 17."
      },
      {
        date: '2025-06-25',
        performer: "Jocelyn Waugh Hot 4",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Jocelyn Waugh Hot 4 features one of Vancouver's most in-demand trumpet players. A versatile entertainer, Jocelyn plays a wide variety of styles from Jazz and Mariachi to Funk and R&B. This free outdoor concert showcases her exceptional talent and versatility."
      },
      {
        date: '2025-06-26',
        performer: "Djangoesque with Don Ogilvie",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: true,
        rescheduleDate: '2025-07-16',
        description: "Djangoesque with Don Ogilvie brings the spirit of Django Reinhardt's gypsy jazz to Yaletown. Experience the intricate guitar work and swinging rhythms that define this distinctive jazz style. Note: This event has been rescheduled to July 16."
      },
      {
        date: '2025-06-27',
        performer: "Company B Jazz Band",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Company B Jazz Band delivers a nostalgic journey through vintage jazz and swing. Their authentic 1940s sound and style bring the golden age of jazz to life in this free outdoor concert at Bill Curtis Square."
      },
      {
        date: '2025-07-01',
        performer: "Joe Abbott Swing Team",
        startTime: '15:30',  // Note different time on Canada Day
        endTime: '17:30',
        rescheduled: false,
        description: "Joe Abbott Swing Team celebrates Canada Day with a special afternoon performance. Their vibrant swing style and infectious energy make for a perfect holiday celebration in this free outdoor concert."
      },
      {
        date: '2025-07-02',
        performer: "Brothers Arntzen",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Brothers Arntzen bring their family musical tradition to the Yaletown Jazz series. Their performances blend traditional jazz with contemporary sensibilities for a unique sound that honors the past while looking to the future."
      },
      {
        date: '2025-07-03',
        performer: "Dean Thiessen and the Good Apples",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Dean Thiessen and the Good Apples deliver a fresh take on jazz standards and original compositions. Their polished sound and creative arrangements make for an engaging free outdoor concert experience."
      },
      {
        date: '2025-07-04',
        performer: "Checo Tohomaso & the VOC Sweet Soul Gospel Choir",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "Checo Tohomaso & the VOC Sweet Soul Gospel Choir bring a powerful fusion of jazz, gospel, and soul to Bill Curtis Square. Their uplifting performance features rich harmonies and infectious rhythms in this free outdoor concert."
      },
      {
        date: '2025-07-09',
        performer: "Noah Gotfrit Quartet",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Noah Gotfrit Quartet performs sophisticated jazz arrangements with exceptional musicianship. Their creative improvisations and tight ensemble work shine in this free outdoor concert in the heart of Yaletown."
      },
      {
        date: '2025-07-10',
        performer: "Bonnie Northgraves Quintet",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Bonnie Northgraves Quintet brings a modern sensibility to classic jazz styles. Led by accomplished trumpeter Bonnie Northgraves, this ensemble delivers a polished and engaging performance in this free outdoor concert."
      },
      {
        date: '2025-07-11',
        performer: "Josh Roberts Quintet",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        description: "The Josh Roberts Quintet showcases innovative jazz compositions and creative improvisations. Their contemporary approach to the jazz tradition makes for a compelling free outdoor concert experience."
      },
      {
        date: '2025-07-16',
        performer: "Djangoesque with Don Ogilvie",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        originalDate: '2025-06-26',
        description: "Djangoesque with Don Ogilvie brings the spirit of Django Reinhardt's gypsy jazz to Yaletown. Experience the intricate guitar work and swinging rhythms that define this distinctive jazz style. This is a rescheduled performance from June 26."
      },
      {
        date: '2025-07-17',
        performer: "Lache Cercel & the Roma Jazz Ensemble",
        startTime: '17:30',
        endTime: '19:30',
        rescheduled: false,
        originalDate: '2025-06-20',
        description: "Lache Cercel & the Roma Jazz Ensemble create dialogue between musical cultures with their unique Roma Jazz style. World-renowned violinist and composer Lache Cercel, along with Don Ogilvie, Kyle Hagen, Paul Townsend and Laura Crema, provide an experience of peace, joy, and harmony. This is a rescheduled performance from June 20."
      }
    ];
  }

  /**
   * Generate a unique ID for the event
   * @param {string} date - Event date in YYYY-MM-DD format
   * @param {string} performer - Name of performer
   * @returns {string} - Formatted ID
   */
  generateEventId(date, performer) {
    const slugPerformer = performer.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
    
    return `yaletown-jazz-${date}-${slugPerformer}`;
  }
  
  /**
   * Convert time string (HH:MM) to Date object
   * @param {string} dateStr - Date in YYYY-MM-DD format
   * @param {string} timeStr - Time in HH:MM format
   * @returns {Date} - JavaScript Date object
   */
  createDateTime(dateStr, timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Yaletown Jazz events scraper...');
    const events = [];
    
    try {
      // Loop through all events and create structured event objects
      for (const eventData of this.events) {
        // Skip events that have been rescheduled - we'll add them on their new date
        if (eventData.rescheduled) {
          continue;
        }
        
        // Create date objects for start and end times
        const startDate = this.createDateTime(eventData.date, eventData.startTime);
        const endDate = this.createDateTime(eventData.date, eventData.endTime);
        
        // Compile description
        let description = eventData.description || this.seriesDescription;
        if (eventData.originalDate) {
          description += ` (Rescheduled from ${new Date(eventData.originalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })})`;
        }
        
        // Format event title
        const eventTitle = `${eventData.performer} - Yaletown Jazz Series`;
        
        // Create event object
        const event = {
          id: this.generateEventId(eventData.date, eventData.performer),
          title: eventTitle,
          description: description,
          startDate: startDate,
          endDate: endDate,
          venue: this.venue,
          category: 'music',
          categories: ['music', 'jazz', 'concert', 'outdoor', 'free'],
          sourceURL: this.url,
          officialWebsite: 'https://yaletowninfo.com/whats-happening/music/',
          image: 'https://yaletowninfo.com/wp-content/uploads/2019/02/Yaletown-music-program.jpg', // Generic image for all events
          recurring: null, // These are individual events
          lastUpdated: new Date()
        };
        
        events.push(event);
        console.log(`✅ Added event: ${eventTitle} on ${startDate.toLocaleDateString()}`);
      }
      
      console.log(`🎉 Successfully scraped ${events.length} Yaletown Jazz events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Yaletown Jazz scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new YaletownJazzScraper();
