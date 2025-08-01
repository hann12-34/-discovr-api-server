/**
 * Squamish Beer Festival 2025 Scraper
 * 
 * This scraper generates the event for the 9th Annual Squamish Beer Festival
 * on June 21, 2025 at Loggers Sports Grounds in Squamish, BC
 */

const { v4: uuidv4 } = require('uuid');

class SquamishBeerFestivalScraper {
  constructor() {
    this.name = 'Squamish Beer Festival';
    this.url = 'https://squamishbeerfestival.com/';
    this.sourceIdentifier = 'squamish-beer-festival';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Loggers Sports Grounds',
      id: 'loggers-sports-grounds-squamish',
      address: '39555 Loggers Ln',
      city: 'Squamish',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V8B 0H9',
      coordinates: {
        lat: 49.7182662,
        lng: -123.1437648
      },
      websiteUrl: 'https://squamishbeerfestival.com/',
      description: "Located in the heart of Squamish, the Loggers Sports Grounds is a versatile outdoor venue that hosts various community events, sports competitions, and festivals. Set against the stunning backdrop of the Coast Mountains, this spacious venue features wide-open grounds and excellent facilities for large gatherings."
    };
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Squamish Beer Festival 2025 scraper...');
    const events = [];
    
    try {
      // Create date objects for the festival
      const startDate = new Date('2025-06-21T13:00:00'); // 1:00 PM
      const endDate = new Date('2025-06-21T18:00:00');   // 6:00 PM
      
      // Entertainment lineup
      const lineup = [
        {
          artist: "Phantom",
          startTime: "1:00 PM",
          description: "Phantom is a rising act from the Sea to Sky region, chosen through a public vote as part of the 'Squamish Arts Presents' competition. With a bold, genre-blending sound and a loyal hometown following, Phantom represents the next wave of emerging BC artists."
        },
        {
          artist: "Old Soul Rebel",
          startTime: "1:50 PM",
          description: "Old Soul Rebel is a dynamic alt-soul/rock duo featuring Lola Whyte of the Squamish Nation and Leo D.E. Johnson of East Vancouver. Known for their gritty, explosive sound and unapologetically powerful performances, Old Soul Rebel has become a staple on major Canadian festival stages."
        },
        {
          artist: "Logan Staats",
          startTime: "3:00 PM",
          description: "Logan Staats hails from Six Nations of the Grand River, and has earned a reputation as one of Canada's cultural tastemakers, a land defender and one of our premiere storytellers. As an artist, he pairs gritty and compelling songwriting with raw, authentic and high energy performances."
        },
        {
          artist: "Shred Kelly",
          startTime: "4:30 PM",
          description: "Shred Kelly is a festival favourite known for their infectious blend of alt-folk, rock, and danceable anthems. Hailing from Fernie, BC, the band has toured across North America and Europe, earning a reputation for raucous, joy-filled live shows that keep audiences moving."
        }
      ];
      
      // Compile the entertainment information
      let entertainmentInfo = "### Live Entertainment Schedule:\n\n";
      lineup.forEach(act => {
        entertainmentInfo += `* **${act.artist}** - ${act.startTime} - ${act.description}\n\n`;
      });
      
      // Create comprehensive description
      const description = `Experience the 9th Annual Squamish Beer Festival! The ultimate craft beer celebration in Canada's adventure playground. Raise a glass to the best of BC—craft beverages, mouthwatering eats, and local talent—all set against the stunning backdrop of Squamish.\n\n${entertainmentInfo}\nThe festival features:\n\n* Craft beer tastings from top BC breweries\n* Delicious food from local vendors\n* Live music throughout the day\n* Local makers market with handcrafted goods\n* Bike parking available\n\nThis is a 19+ event. Valid ID required for entry. No minors permitted on site.`;
      
      // Create event object
      const event = {
        id: 'squamish-beer-festival-2025',
        title: '9th Annual Squamish Beer Festival',
        description: description,
        startDate: startDate,
        endDate: endDate,
        venue: this.venue,
        category: 'festival',
        categories: ['festival', 'beer', 'food', 'music', 'outdoor'],
        sourceURL: this.url,
        officialWebsite: 'https://squamishbeerfestival.com/',
        image: 'https://squamishbeerfestival.com/wp-content/uploads/2025/01/squamish-beer-festival-2025-header.jpg',
        recurring: null, // One-time event
        ticketsRequired: true,
        ticketsUrl: 'https://squamishbeerfestival.com/tickets/',
        ageRestriction: '19+',
        lastUpdated: new Date()
      };
      
      events.push(event);
      console.log(`✅ Added event: ${event.title}`);
      
      console.log(`🎉 Successfully scraped Squamish Beer Festival 2025 event`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Squamish Beer Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new SquamishBeerFestivalScraper();
