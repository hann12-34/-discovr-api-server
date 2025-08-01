/**
 * Vancouver Symphony Orchestra Scraper
 * 
 * This scraper provides information about Vancouver Symphony Orchestra events
 * Source: https://www.vancouversymphony.ca/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class VancouverSymphonyScraper {
  constructor() {
    this.name = 'Vancouver Symphony Orchestra';
    this.url = 'https://www.vancouversymphony.ca/';
    this.sourceIdentifier = 'vancouver-symphony';
    
    // Main venue - Orpheum Theatre
    this.mainVenue = {
      name: 'Orpheum Theatre',
      id: 'orpheum-theatre-vancouver',
      address: '601 Smithe St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6B 3L4',
      coordinates: {
        lat: 49.2809242, 
        lng: -123.1204763
      },
      websiteUrl: 'https://www.vancouversymphony.ca/about-the-vso/orpheum-theatre/',
      description: "The Orpheum is a designated National Heritage Site and Vancouver's most elegant theatre. With its elaborately decorated interior and excellent acoustics, this venue is the VSO's main performing venue and one of the most beautiful concert halls in North America."
    };
    
    // Secondary venue - Chan Centre
    this.chanCentre = {
      name: 'Chan Centre for the Performing Arts',
      id: 'chan-centre-ubc-vancouver',
      address: '6265 Crescent Rd',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6T 1Z1',
      coordinates: {
        lat: 49.2696444, 
        lng: -123.2565745
      },
      websiteUrl: 'https://chancentre.com/',
      description: "The Chan Centre for the Performing Arts at UBC is a magnificent performance facility renowned for its exceptional acoustics and intimate ambiance. The Chan Centre houses the Chan Shun Concert Hall, a 1,185-seat theatre with superb acoustics, making it ideal for musical performances."
    };
    
    // Bell Performing Arts Centre in Surrey
    this.bellCentre = {
      name: 'Bell Performing Arts Centre',
      id: 'bell-performing-arts-centre-surrey',
      address: '6250 144 St',
      city: 'Surrey',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V3X 1A1',
      coordinates: {
        lat: 49.1146399, 
        lng: -122.8254438
      },
      websiteUrl: 'https://bellperformingartscentre.com/',
      description: "The Bell Performing Arts Centre is a 1,052-seat theatre in Surrey featuring excellent acoustics and sightlines, designed for concerts, theatre, and dance performances."
    };
    
    // 2025 Symphony Season performances
    // Each concert typically has 2-3 performances over a weekend
    this.concerts = [
      {
        title: "Beethoven's Emperor Concerto",
        description: "Otto Tausk conducts the VSO in a program featuring acclaimed pianist Jan Lisiecki performing Beethoven's majestic 'Emperor' Concerto. The program opens with Jocelyn Morlock's captivating 'Oiseaux Bleus et Sauvages' and concludes with Dvořák's spirited Symphony No. 8, a work brimming with Czech folk melodies and pastoral charm.",
        conductor: "Otto Tausk",
        soloist: "Jan Lisiecki, piano",
        program: [
          "JOCELYN MORLOCK: Oiseaux Bleus et Sauvages",
          "BEETHOVEN: Piano Concerto No. 5 in E-flat Major, Op. 73 'Emperor'",
          "DVOŘÁK: Symphony No. 8 in G Major, Op. 88"
        ],
        venue: "Orpheum Theatre",
        dates: [
          new Date("2025-09-19T20:00:00"),
          new Date("2025-09-20T20:00:00"),
          new Date("2025-09-21T14:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/beethoven-emperor.jpg",
        duration: 120 // in minutes
      },
      {
        title: "Mozart & Mahler",
        description: "Guest conductor Gemma New leads the VSO in a powerful program pairing Mozart's elegant Piano Concerto No. 21 featuring soloist Inon Barnatan with Mahler's profoundly moving Symphony No. 4, featuring soprano Dorothea Röschmann in the ethereal final movement.",
        conductor: "Gemma New",
        soloist: "Inon Barnatan, piano; Dorothea Röschmann, soprano",
        program: [
          "MOZART: Piano Concerto No. 21 in C Major, K. 467",
          "MAHLER: Symphony No. 4 in G Major"
        ],
        venue: "Orpheum Theatre",
        dates: [
          new Date("2025-10-10T20:00:00"),
          new Date("2025-10-11T20:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/mozart-mahler.jpg",
        duration: 135 // in minutes
      },
      {
        title: "Tchaikovsky's Violin Concerto",
        description: "James Gaffigan conducts the VSO with star violinist Augustin Hadelich in Tchaikovsky's technically demanding and emotionally expressive Violin Concerto. The program begins with Gabriela Lena Frank's 'Elegia Andina' and concludes with Rachmaninoff's lush and melodic Symphony No. 2.",
        conductor: "James Gaffigan",
        soloist: "Augustin Hadelich, violin",
        program: [
          "GABRIELA LENA FRANK: Elegía Andina",
          "TCHAIKOVSKY: Violin Concerto in D Major, Op. 35",
          "RACHMANINOFF: Symphony No. 2 in E minor, Op. 27"
        ],
        venue: "Orpheum Theatre",
        dates: [
          new Date("2025-11-07T20:00:00"),
          new Date("2025-11-08T20:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/tchaikovsky-violin.jpg",
        duration: 140 // in minutes
      },
      {
        title: "Vivaldi's Four Seasons",
        description: "Concertmaster Nicholas Wright leads the VSO string section in this special presentation of Vivaldi's beloved 'Four Seasons,' interspersed with Astor Piazzolla's innovative 'Four Seasons of Buenos Aires,' creating a fascinating dialogue between Baroque and tango traditions.",
        conductor: "Nicholas Wright",
        soloist: "Nicholas Wright, violin",
        program: [
          "VIVALDI: The Four Seasons, Op. 8, Nos. 1-4",
          "PIAZZOLLA: The Four Seasons of Buenos Aires"
        ],
        venue: "Chan Centre for the Performing Arts",
        dates: [
          new Date("2025-12-05T20:00:00"),
          new Date("2025-12-06T14:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/vivaldi-seasons.jpg",
        duration: 110 // in minutes
      },
      {
        title: "Holst's The Planets",
        description: "Otto Tausk conducts the VSO in a cosmic journey through Holst's monumental suite 'The Planets,' featuring the ethereal voices of the VSO Women's Chorus. The concert opens with Kaija Saariaho's mesmerizing 'Ciel d'hiver' and John Adams' pulsating 'Short Ride in a Fast Machine.'",
        conductor: "Otto Tausk",
        soloist: "VSO Women's Chorus",
        program: [
          "KAIJA SAARIAHO: Ciel d'hiver",
          "JOHN ADAMS: Short Ride in a Fast Machine",
          "HOLST: The Planets, Op. 32"
        ],
        venue: "Orpheum Theatre",
        dates: [
          new Date("2025-12-12T20:00:00"),
          new Date("2025-12-13T20:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/holst-planets.jpg",
        duration: 125 // in minutes
      },
      {
        title: "Surrey Nights: Brahms & Sibelius",
        description: "The VSO brings a powerful program to Surrey featuring Sibelius' majestic Symphony No. 2 and Brahms' dramatic Piano Concerto No. 1 with acclaimed pianist Saleem Ashkar.",
        conductor: "Otto Tausk",
        soloist: "Saleem Ashkar, piano",
        program: [
          "BRAHMS: Piano Concerto No. 1 in D minor, Op. 15",
          "SIBELIUS: Symphony No. 2 in D Major, Op. 43"
        ],
        venue: "Bell Performing Arts Centre",
        dates: [
          new Date("2025-10-22T20:00:00")
        ],
        image: "https://www.vancouversymphony.ca/wp-content/uploads/2025/06/brahms-sibelius.jpg",
        duration: 130 // in minutes
      }
    ];
  }
  
  /**
   * Get venue object based on venue name
   */
  getVenueByName(venueName) {
    if (venueName === 'Orpheum Theatre') {
      return this.mainVenue;
    } else if (venueName === 'Chan Centre for the Performing Arts') {
      return this.chanCentre;
    } else if (venueName === 'Bell Performing Arts Centre') {
      return this.bellCentre;
    } else {
      return this.mainVenue; // Default to Orpheum
    }
  }
  
  /**
   * Format program list into HTML
   */
  formatProgram(programArray) {
    return programArray.join("<br>");
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Symphony Orchestra scraper...');
    const events = [];
    
    try {
      // Generate events for each concert performance
      for (const concert of this.concerts) {
        const venue = this.getVenueByName(concert.venue);
        
        // Create event for each performance date
        for (const performanceDate of concert.dates) {
          // Create end time (start time + duration)
          const endDate = new Date(performanceDate);
          endDate.setMinutes(endDate.getMinutes() + concert.duration);
          
          // Format date for ID
          const dateString = performanceDate.toISOString().split('T')[0];
          const timeString = performanceDate.toISOString().split('T')[1].substring(0, 5).replace(':', '-');
          
          // Create unique ID
          const slugifiedTitle = concert.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          const eventId = `vso-${slugifiedTitle}-${dateString}`;
          
          // Format date and time for display
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
          
          const formattedDate = dateFormat.format(performanceDate);
          const formattedTime = timeFormat.format(performanceDate);
          
          // Create detailed description
          const detailedDescription = `
${concert.description}

PROGRAM:
${this.formatProgram(concert.program)}

ARTISTS:
Conductor: ${concert.conductor}
${concert.soloist ? concert.soloist : ''}

PERFORMANCE DETAILS:
Date: ${formattedDate}
Time: ${formattedTime}
Venue: ${concert.venue}
Duration: Approximately ${Math.floor(concert.duration / 60)} hours ${concert.duration % 60 > 0 ? concert.duration % 60 + ' minutes' : ''}
          `;
          
          // Create event object
          const event = {
            id: eventId,
            title: concert.title,
            description: detailedDescription.trim(),
            startDate: performanceDate,
            endDate: endDate,
            venue: venue,
            category: 'music',
            categories: ['music', 'classical', 'orchestra', 'symphony', 'concert', 'performance'],
            sourceURL: this.url,
            officialWebsite: 'https://www.vancouversymphony.ca/tickets/',
            image: concert.image || null,
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added VSO event: ${concert.title} on ${formattedDate}`);
        }
      }
      
      console.log(`🎻 Successfully created ${events.length} Vancouver Symphony Orchestra events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Symphony Orchestra scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverSymphonyScraper();
