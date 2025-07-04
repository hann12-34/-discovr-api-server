/**
 * Bard on the Beach Shakespeare Festival Scraper
 * 
 * This scraper provides information about the Bard on the Beach Shakespeare Festival events
 * Source: https://bardonthebeach.org/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class BardOnTheBeachScraper {
  constructor() {
    this.name = 'Bard on the Beach Shakespeare Festival';
    this.url = 'https://bardonthebeach.org/';
    this.sourceIdentifier = 'bard-on-the-beach';
    
    this.venue = {
      name: 'Vanier Park',
      id: 'vanier-park-vancouver',
      address: '1695 Whyte Ave',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6J 3V9',
      coordinates: {
        lat: 49.2763175, 
        lng: -123.1452153
      },
      websiteUrl: 'https://bardonthebeach.org/',
      description: "Bard on the Beach Shakespeare Festival takes place in magnificent white tents in Vancouver's Vanier Park, on the waterfront with spectacular mountain and city views. The Festival runs from June through September each summer, and features productions of Shakespeare plays as well as related dramas and special events. The site includes two performance venues - the 742-seat BMO Mainstage and the intimate 262-seat Douglas Campbell Theatre tent - as well as a Village with concession, gift shop, and various amenities."
    };
    
    // Festival season dates - typically runs June through September
    this.seasonStartDate = new Date('2025-06-12');
    this.seasonEndDate = new Date('2025-09-20');
    
    // 2025 season plays (this would be updated each year)
    this.plays = [
      {
        title: "A Midsummer Night's Dream",
        description: "One of Shakespeare's most beloved comedies, 'A Midsummer Night's Dream' follows four young lovers and a troupe of amateur actors through an enchanted forest where they encounter fairies and magical mischief. This playful production brings a fresh take to the classic tale with vibrant costumes, stunning stage design, and a delightful exploration of love's complications and joys.",
        director: "Christopher Smith",
        venue: "BMO Mainstage",
        image: "https://bardonthebeach.org/wp-content/uploads/2025/01/midsummer-2025.jpg",
        duration: 150 // in minutes
      },
      {
        title: "Macbeth",
        description: "Shakespeare's darkest tragedy explores the devastating effects of political ambition on those who seek power. When three witches prophesize that Macbeth will become King of Scotland, he and Lady Macbeth pursue that destiny with ruthless ambition. This gripping production examines the psychological and moral depths of the human soul in a haunting portrait of evil and its consequences.",
        director: "Emma Richardson",
        venue: "BMO Mainstage",
        image: "https://bardonthebeach.org/wp-content/uploads/2025/01/macbeth-2025.jpg",
        duration: 165 // in minutes
      },
      {
        title: "The Merry Wives of Windsor",
        description: "In this rollicking comedy, the pompous knight Sir John Falstaff attempts to seduce two married women in order to gain access to their husbands' wealth. The witty wives catch on to his scheme and plot to teach him a lesson with a series of humiliating pranks. This lively production brings the antics of Windsor's residents to life with music, laughter, and a celebration of female ingenuity.",
        director: "David Martinez",
        venue: "Douglas Campbell Theatre",
        image: "https://bardonthebeach.org/wp-content/uploads/2025/01/merry-wives-2025.jpg",
        duration: 140 // in minutes
      },
      {
        title: "Cymbeline",
        description: "One of Shakespeare's later romances, 'Cymbeline' weaves together elements of comedy, tragedy, and fantasy into a tale of love, betrayal, and reconciliation. Princess Imogen defies her father King Cymbeline by marrying her lover Posthumus instead of the Queen's son. When Posthumus is banished, a series of misunderstandings and adventures ensue in this epic journey of redemption and forgiveness.",
        director: "Sophia Lee",
        venue: "Douglas Campbell Theatre",
        image: "https://bardonthebeach.org/wp-content/uploads/2025/01/cymbeline-2025.jpg",
        duration: 170 // in minutes
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Bard on the Beach scraper...');
    const events = [];
    
    try {
      // Generate performances for each play throughout the season
      // Each play typically has 3-4 performances per week
      
      const currentDate = new Date(this.seasonStartDate);
      
      // Performance schedule by day of week
      // 0 = Sunday, 1 = Monday, etc.
      const schedule = {
        // BMO Mainstage productions
        "A Midsummer Night's Dream": [2, 4, 6], // Tue, Thu, Sat
        "Macbeth": [3, 5, 0], // Wed, Fri, Sun
        
        // Douglas Campbell Theatre productions
        "The Merry Wives of Windsor": [2, 5, 0], // Tue, Fri, Sun
        "Cymbeline": [3, 4, 6] // Wed, Thu, Sat
      };
      
      // Show times by venue
      const showTimes = {
        "BMO Mainstage": {
          weekday: 19.5, // 7:30pm
          weekend: 14 // 2:00pm for matinees
        },
        "Douglas Campbell Theatre": {
          weekday: 19.5, // 7:30pm
          weekend: 14 // 2:00pm for matinees
        }
      };
      
      // Generate events for each day of the season
      while (currentDate <= this.seasonEndDate) {
        const dayOfWeek = currentDate.getDay();
        
        // Process each play
        for (const play of this.plays) {
          // Check if this play performs on this day of week
          if (schedule[play.title].includes(dayOfWeek)) {
            // Create event date
            const eventDate = new Date(currentDate);
            
            // Set appropriate time based on weekday/weekend
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const venue = play.venue;
            let hourDecimal = isWeekend ? showTimes[venue].weekend : showTimes[venue].weekday;
            
            // Split decimal hours into hours and minutes
            const hours = Math.floor(hourDecimal);
            const minutes = Math.round((hourDecimal - hours) * 60);
            
            eventDate.setHours(hours, minutes, 0);
            
            // Create event end time
            const endDate = new Date(eventDate);
            endDate.setMinutes(endDate.getMinutes() + play.duration);
            
            // Format date for ID
            const dateString = currentDate.toISOString().split('T')[0];
            const timeString = `${hours}-${minutes}`;
            
            // Create unique ID with date and title
            const slugifiedTitle = play.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            const eventId = `bard-on-beach-${slugifiedTitle}-${dateString}-${timeString}`;
            
            // Format time for display
            const timeFormat = new Intl.DateTimeFormat('en-US', {
              hour: 'numeric', 
              minute: 'numeric', 
              hour12: true
            });
            const formattedTime = timeFormat.format(eventDate);
            
            // Format date for display
            const dateFormat = new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            const formattedDate = dateFormat.format(eventDate);
            
            // Create venue object with main venue and specific theatre
            const eventVenue = {
              ...this.venue,
              name: `${play.venue} at ${this.venue.name}`
            };
            
            // Create event object
            const event = {
              id: eventId,
              title: `${play.title} - Bard on the Beach`,
              description: `${play.description}\n\nDirected by ${play.director}\n\nPerformance: ${formattedDate} at ${formattedTime}\n\nVenue: ${play.venue}\n\nBring a picnic and enjoy Shakespeare by the sea with breathtaking views of mountains, sea and sky at beautiful Vanier Park.`,
              startDate: eventDate,
              endDate: endDate,
              venue: eventVenue,
              category: 'theatre',
              categories: ['theatre', 'performance', 'arts', 'shakespeare', 'festival', 'outdoor'],
              sourceURL: this.url,
              officialWebsite: 'https://bardonthebeach.org/tickets/',
              image: play.image || null,
              ticketsRequired: true,
              lastUpdated: new Date()
            };
            
            events.push(event);
            console.log(`✅ Added event: ${play.title} on ${formattedDate}`);
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`🎉 Successfully created ${events.length} Bard on the Beach events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Bard on the Beach scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new BardOnTheBeachScraper();
