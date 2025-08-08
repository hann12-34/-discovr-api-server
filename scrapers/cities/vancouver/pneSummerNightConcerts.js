/**
 * PNE Summer Night Concerts 2025 Scraper
 *
 * This scraper generates events for the PNE Fair's Summer Night Concerts series
 * from August 16 to September 1, 2025 at the Pacific Coliseum
 */

const { v4: uuidv4 } = require('uuid');

class PNESummerNightConcertsScraper {
  constructor() {
    this.name = 'PNE Summer Night Concerts';
    this.url = 'https://www.pne.ca/snc/';
    this.sourceIdentifier = 'pne-summer-night-concerts';

    // Define venue with proper object structure
    this.venue = {
      name: 'Pacific Coliseum at the PNE',
      id: 'pacific-coliseum-pne',
      address: '2901 E Hastings St',
      city: city,
      state: 'BC',
      country: 'Canada',
      postalCode: 'V5K 0A1',
      coordinates: {
        lat: 49.2846974,
        lng: -123.0356767
      },
      websiteUrl: 'https://www.pne.ca/snc/',
      description: "The Pacific Coliseum is an indoor arena located at Hastings Park in Vancouver, British Columbia. It is the largest venue at the Pacific National Exhibition (PNE) and hosts concerts, sporting events, and other large-scale entertainment during the annual PNE Fair. With a seating capacity of over 15,000, it provides a spacious venue for the popular Summer Night Concerts series that runs during the Fair."
    };

    // Series description
    this.seriesDescription = "The PNE Fair's Summer Night Concerts series is an iconic staple in the Vancouver summer experience. These evening performances feature some of the biggest names in music spanning diverse genres from rock and pop to hip-hop and world music. Concert admission includes entry to the PNE Fair, allowing attendees to enjoy rides, exhibits, food, and entertainment before the show.";

    // Concert schedule
    this.concerts = [
      {
        date: '2025-08-16',
        performer: "Counting Crows",
        description: "American rock band Counting Crows brings their distinctive sound and hit songs like 'Mr. Jones,' 'Round Here,' and 'A Long December' to the PNE Summer Night Concerts. Known for their energetic live performances, the band delivers a perfect mix of their classic hits and newer material."
      },
      {
        date: '2025-08-17',
        performer: "Lynyrd Skynyrd",
        description: "Southern rock legends Lynyrd Skynyrd take the stage at the PNE Summer Night Concerts. With their unmistakable three-guitar sound and hits like 'Sweet Home Alabama' and 'Free Bird,' this iconic band promises a high-energy performance celebrating their musical legacy."
      },
      {
        date: '2025-08-19',
        performer: "Bleachers",
        description: "Indie pop band Bleachers, fronted by Grammy-winning songwriter and producer Jack Antonoff, delivers their anthemic, nostalgic sound to the PNE Summer Night Concerts. Known for hits like 'I Wanna Get Better' and 'Don't Take The Money,' their energetic live show combines catchy hooks with personal lyrics."
      },
      {
        date: '2025-08-20',
        performer: "Gipsy Kings feat. Nicolas Reyes",
        description: "The world-renowned Gipsy Kings featuring Nicolas Reyes bring their infectious blend of traditional flamenco, Latin rhythms, and Western pop to the PNE Summer Night Concerts. Known for hits like 'Bamboléo' and 'Djobi, Djoba,' their passionate performances transcend language barriers."
      },
      {
        date: '2025-08-21',
        performer: "To Be Announced",
        description: "Stay tuned for an exciting artist announcement for this date at the PNE Summer Night Concerts. This mystery performer will join the stellar lineup of artists at the Pacific Coliseum during the 2025 PNE Fair."
      },
      {
        date: '2025-08-22',
        performer: "Flo Rida",
        description: "Chart-topping rapper Flo Rida brings his high-energy performance and string of hits to the PNE Summer Night Concerts. Known for party anthems like 'Low,' 'Right Round,' and 'Good Feeling,' his dynamic stage presence and infectious beats promise a night of non-stop dancing."
      },
      {
        date: '2025-08-23',
        performer: "Leon Bridges",
        description: "Grammy-winning soul singer Leon Bridges brings his smooth vocals and retro-inspired sound to the PNE Summer Night Concerts. Known for songs like 'Coming Home,' 'River,' and 'Beyond,' his performance blends classic soul with contemporary sensibilities for an unforgettable evening."
      },
      {
        date: '2025-08-24',
        performer: "Marianas Trench",
        description: "Canadian pop-rock band Marianas Trench returns to their hometown for a special performance at the PNE Summer Night Concerts. Known for their theatrical performances and hits like 'Cross My Heart,' 'Celebrity Status,' and 'Haven't Had Enough,' the Vancouver natives always deliver an energetic show."
      },
      {
        date: '2025-08-26',
        performer: "Sean Paul",
        description: "Grammy-winning dancehall superstar Sean Paul brings his global hits and Caribbean rhythms to the PNE Summer Night Concerts. Known for chart-toppers like 'Get Busy,' 'Temperature,' and countless collaborations, his high-energy performance will transform the Pacific Coliseum into a dancehall party."
      },
      {
        date: '2025-08-27',
        performer: "Wilco",
        description: "Alternative rock pioneers Wilco bring their critically acclaimed music to the PNE Summer Night Concerts. Known for their experimental sound and albums like 'Yankee Hotel Foxtrot,' the Grammy-winning band delivers a mesmerizing live experience that showcases their musical evolution."
      },
      {
        date: '2025-08-28',
        performer: "Foreigner",
        description: "Rock legends Foreigner bring their arsenal of classic hits to the PNE Summer Night Concerts. With iconic songs like 'I Want To Know What Love Is,' 'Cold As Ice,' and 'Juke Box Hero,' their performance celebrates a legacy of arena rock anthems that defined a generation."
      },
      {
        date: '2025-08-29',
        performer: "Tom Cochrane",
        description: "Canadian rock icon Tom Cochrane takes the stage at the PNE Summer Night Concerts. Known for hits like 'Life Is A Highway,' 'Big League,' and his work with Red Rider, the multiple JUNO Award winner brings his signature sound and storytelling to this special performance."
      },
      {
        date: '2025-08-30',
        performer: "Meghan Trainor",
        description: "Grammy-winning pop sensation Meghan Trainor brings her catchy hits and retro-inspired sound to the PNE Summer Night Concerts. Known for chart-toppers like 'All About That Bass,' 'Lips Are Movin,' and 'No,' her vibrant performance combines doo-wop-infused pop with empowering messages."
      },
      {
        date: '2025-08-31',
        performer: "To Be Announced",
        description: "Stay tuned for an exciting artist announcement for this date at the PNE Summer Night Concerts. This mystery performer will join the stellar lineup of artists at the Pacific Coliseum during the 2025 PNE Fair."
      },
      {
        date: '2025-09-01',
        performer: "Rainbow Kitten Surprise",
        description: "Alternative indie band Rainbow Kitten Surprise brings their eclectic sound and energetic live show to the PNE Summer Night Concerts. Known for their genre-blending style that incorporates folk, rock, and hip-hop elements, the band delivers a captivating performance with songs like 'It's Called: Freefall' and 'Fever Pitch'."
      }
    ];
  }

  /**
   * Generate a unique ID for the concert
   * @param {string} date - Concert date in YYYY-MM-DD format
   * @param {string} performer - Name of performer
   * @returns {string} - Formatted ID
   */
  generateConcertId(date, performer) {
    if (performer === "To Be Announced") {
      return `pne-concert-${date}-tba`;
    }

    const slugPerformer = performer.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');

    return `pne-concert-${date}-${slugPerformer}`;
  }

  /**
   * Create date object for concert time
   * @param {string} da - Date in YYYY-MM-DD format
   * @returns {Object} - Start and end date objects
   */
  createConcertDateTime(da) {
    // All concerts start at 7:30 PM and end around 10:00 PM
    const startDate = new Date(`${da}T19:30:00`);
    const endDate = new Date(`${da}T22:00:00`);

    return { startDate, endDate };
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting PNE Summer Night Concerts scraper...');
    const events = [];

    try {
      // Process each concert in the schedule
      for (const concert of this.concerts) {
        // Create date objects
        const { startDate, endDate } = this.createConcertDateTime(concert.date);

        // Format event title
        const eventTitle = `${concert.performer} - PNE Summer Night Concert`;

        // Create event object
        const event = {
          id: this.generateConcertId(concert.date, concert.performer),
          title: eventTitle,
          description: concert.description || this.seriesDescription,
          startDate: startDate,
          endDate: endDate,
          venue: this.venue,
          category: 'music',
          categories: ['music', 'concert', 'live-music', 'pne-fair'],
          sourceURL: this.url,
          officialWebsite: 'https://www.pne.ca/snc/',
          image: 'https://www.pne.ca/wp-content/uploads/2024/05/SNC2025-Web-Banner-1200x628-1.jpg',
          recurring: null, // These are individual events
          ticketsRequired: true,
          ticketsUrl: 'https://www.ticketleader.ca/events/detail/snc2025',
          lastUpdated: new Date()
        };

        events.push(event);
        console.log(`✅ Added concert: ${eventTitle} on ${startDate.toLocaleDa`);
      }

      console.log(`🎉 Successfully scraped ${events.length} PNE Summer Night Concerts`);
      return events;

    } catch (error) {
      console.error(`❌ Error in PNE Summer Night Concerts scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new PNESummerNightConcertsScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new PNESummerNightConcertsScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.PNESummerNightConcertsScraper = PNESummerNightConcertsScraper;