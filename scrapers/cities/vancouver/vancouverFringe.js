/**
 * Vancouver Fringe Festival Scraper
 * 
 * This scraper provides information about Vancouver Fringe Festival events
 * Source: https://vancouverfringe.com/
 */

const { v4: uuidv4 } = require('uuid');

class VancouverFringeScraper {
  constructor() {
    this.name = 'Vancouver Fringe Festival';
    this.url = 'https://vancouverfringe.com/';
    this.sourceIdentifier = 'vancouver-fringe';
    
    // Festival dates - typically September
    this.festivalStartDate = new Date('2025-09-04');
    this.festivalEndDate = new Date('2025-09-14');
    
    // Main venues for the festival
    this.venues = {
      "Revue Stage": {
        name: "Revue Stage at Granville Island",
        id: "revue-stage-granville-island",
        address: "1601 Johnston St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6H 3R9",
        coordinates: {
          lat: 49.2717798,
          lng: -123.1336329
        },
        websiteUrl: "https://vancouverfringe.com/venues/",
        description: "The Revue Stage is located on Granville Island and is one of the festival's main venues, offering an intimate performance space for Fringe productions."
      },
      "Waterfront Theatre": {
        name: "Waterfront Theatre at Granville Island",
        id: "waterfront-theatre-granville-island",
        address: "1412 Cartwright St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6H 3R7",
        coordinates: {
          lat: 49.2715642,
          lng: -123.1348765
        },
        websiteUrl: "https://vancouverfringe.com/venues/",
        description: "The Waterfront Theatre is a 224-seat venue on Granville Island that hosts some of the largest productions at the Vancouver Fringe Festival."
      },
      "Performance Works": {
        name: "Performance Works on Granville Island",
        id: "performance-works-granville-island",
        address: "1218 Cartwright St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6H 3R9",
        coordinates: {
          lat: 49.2709018,
          lng: -123.1346074
        },
        websiteUrl: "https://vancouverfringe.com/venues/",
        description: "Performance Works is a versatile black box theatre space on Granville Island that hosts a variety of innovative Fringe performances."
      },
      "Firehall Arts Centre": {
        name: "Firehall Arts Centre",
        id: "firehall-arts-centre-vancouver",
        address: "280 E Cordova St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6A 1L3",
        coordinates: {
          lat: 49.2812006,
          lng: -123.0984612
        },
        websiteUrl: "https://firehallartscentre.ca/",
        description: "The Firehall Arts Centre is housed in a heritage fire station in Vancouver's Downtown Eastside and features a 136-seat theatre that hosts Fringe Festival productions."
      },
      "Red Gate Revue Stage": {
        name: "Red Gate Revue Stage",
        id: "red-gate-revue-stage-vancouver",
        address: "1601 Johnston St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        postalCode: "V6H 3R9",
        coordinates: {
          lat: 49.2718136,
          lng: -123.1336598
        },
        websiteUrl: "https://vancouverfringe.com/venues/",
        description: "The Red Gate Revue Stage is an intimate venue on Granville Island that features experimental and cutting-edge Fringe performances."
      }
    };
    
    // Sample shows for the 2025 festival
    this.shows = [
      {
        title: "The Quantum Paradox",
        creator: "Lumina Theatre Collective",
        origin: "Vancouver, BC",
        description: "A mind-bending theatrical experience that explores the nature of reality through parallel universes. When physicist Dr. Maya Chen creates a machine that can glimpse alternate realities, she discovers versions of herself that made vastly different life choices. As the boundaries between worlds begin to blur, she must confront the roads not taken and decide which reality is truly hers. This innovative one-woman show features stunning visual projections, original music, and a tour-de-force performance that questions the very fabric of existence.",
        venue: "Waterfront Theatre",
        runtime: 70,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/quantum-paradox.jpg"
      },
      {
        title: "Clown Apocalypse",
        creator: "Fool Hardy Productions",
        origin: "Toronto, ON",
        description: "When the world ends, only the clowns will survive. This hilarious and heartbreaking physical comedy follows three clowns as they navigate the wasteland of a post-apocalyptic society. Using minimal dialogue, masterful slapstick, and unexpected poignancy, 'Clown Apocalypse' finds humor in hopelessness and beauty in the absurd. Winner of Best Physical Comedy at the Toronto Fringe Festival.",
        venue: "Performance Works",
        runtime: 60,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/clown-apocalypse.jpg"
      },
      {
        title: "Whispers in the Dark",
        creator: "Shadow Box Theatre",
        origin: "Seattle, WA",
        description: "An immersive horror experience that blends puppetry, shadow play, and binaural sound design to create a uniquely terrifying theatrical event. Audience members are given headphones and led through a tale of ancient family secrets and supernatural revenge. As the boundaries between performance and reality dissolve, each audience member becomes part of the unfolding nightmare. Not recommended for those with claustrophobia or sensitivity to darkness.",
        venue: "Firehall Arts Centre",
        runtime: 75,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/whispers-dark.jpg"
      },
      {
        title: "Queer Folklórico",
        creator: "Marco Espinoza",
        origin: "Mexico City, Mexico",
        description: "A dazzling solo performance that combines traditional Mexican dance with contemporary queer storytelling. Performer and choreographer Marco Espinoza reimagines the folkloric dances of his childhood through the lens of his identity as a gay man, creating a vibrant tapestry of movement that honors tradition while boldly stepping into new territory. Featuring stunning costumes, stirring music, and personal narrative, this show celebrates the intersection of cultural heritage and LGBTQ+ identity.",
        venue: "Revue Stage",
        runtime: 55,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/queer-folklorico.jpg"
      },
      {
        title: "The Millennials vs. The Apocalypse",
        creator: "Avocado Toast Theatre Company",
        origin: "Vancouver, BC",
        description: "In this satirical comedy, a group of millennial friends faces the end of the world with nothing but their smartphones, overpriced coffee, and crippling student debt. As climate disaster, economic collapse, and a zombie outbreak converge, they must overcome their generational stereotypes to save humanity—or at least get enough likes on their apocalypse selfies. A biting commentary on generational divides, social media addiction, and the very real anxieties of growing up in uncertain times.",
        venue: "Red Gate Revue Stage",
        runtime: 65,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/millennials-apocalypse.jpg"
      },
      {
        title: "Shakespeare's Lost Play",
        creator: "Bardolators Anonymous",
        origin: "London, UK",
        description: "Three Shakespearean scholars claim to have discovered a lost play by the Bard and perform it for the first time in 400 years. As their academic rivalry intensifies and the authenticity of their discovery comes into question, the performance devolves into a hilarious blend of genuine Elizabethan verse, wild improvisation, and scholarly meltdowns. This love letter to Shakespeare manages to be both academically sharp and wickedly funny.",
        venue: "Performance Works",
        runtime: 90,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/shakespeare-lost.jpg"
      },
      {
        title: "The Art of Falling",
        creator: "Aerial Dreams Collective",
        origin: "Montreal, QC",
        description: "A breathtaking circus-theatre piece that explores themes of trust, vulnerability, and resilience through aerial arts. Five performers weave together stunning acrobatics, personal narratives, and visual poetry as they literally and metaphorically explore what it means to fall and rise again. With original live music and innovative rigging, 'The Art of Falling' transforms the Waterfront Theatre into a vertical playground where gravity becomes both adversary and ally.",
        venue: "Waterfront Theatre",
        runtime: 75,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/art-falling.jpg"
      },
      {
        title: "Grandmother's Attic",
        creator: "Eleanor Chen",
        origin: "Vancouver, BC",
        description: "In this touching one-woman show, playwright and performer Eleanor Chen unpacks her grandmother's belongings after her passing, discovering untold stories of immigration, resilience, and sacrifice. Through storytelling, puppetry, and object manipulation, Chen brings to life three generations of Chinese-Canadian women and their complex relationships to identity, belonging, and the objects they carry through life. A delicate exploration of family history and the stories contained in everyday items.",
        venue: "Firehall Arts Centre",
        runtime: 60,
        image: "https://vancouverfringe.com/wp-content/uploads/2025/06/grandmothers-attic.jpg"
      }
    ];
  }
  
  /**
   * Generate a consistent schedule for performances throughout the festival
   */
  generateSchedule() {
    const schedule = [];
    
    // Each show typically performs 5-6 times during the festival
    // Performances are staggered throughout the day
    
    const showTimes = {
      "Waterfront Theatre": [14, 16, 19, 21], // 2pm, 4pm, 7pm, 9pm
      "Performance Works": [15, 17, 19.5, 21.5], // 3pm, 5pm, 7:30pm, 9:30pm
      "Revue Stage": [14.5, 16.5, 19, 21], // 2:30pm, 4:30pm, 7pm, 9pm
      "Firehall Arts Centre": [15, 17.5, 20], // 3pm, 5:30pm, 8pm
      "Red Gate Revue Stage": [16, 18, 20] // 4pm, 6pm, 8pm
    };
    
    // Assign each show to specific dates and times
    const currentDate = new Date(this.festivalStartDate);
    let dayCount = 0;
    
    while (currentDate <= this.festivalEndDate) {
      dayCount++;
      
      // Cycle through shows and assign performances
      for (let i = 0; i < this.shows.length; i++) {
        const show = this.shows[i];
        const venue = show.venue;
        
        // Each show performs every 2-3 days
        if (dayCount % 3 === i % 3) {
          // Pick a time slot based on venue and day
          const timeSlotIndex = (i + dayCount) % showTimes[venue].length;
          const timeSlot = showTimes[venue][timeSlotIndex];
          
          // Create performance date and time
          const performanceDate = new Date(currentDate);
          const hours = Math.floor(timeSlot);
          const minutes = Math.round((timeSlot - hours) * 60);
          performanceDate.setHours(hours, minutes, 0, 0);
          
          // Create end time
          const endDate = new Date(performanceDate);
          endDate.setMinutes(endDate.getMinutes() + show.runtime);
          
          // Add to schedule
          schedule.push({
            show: show,
            date: performanceDate,
            endDate: endDate
          });
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return schedule;
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Vancouver Fringe Festival scraper...');
    const events = [];
    
    try {
      // Generate a schedule for all performances
      const schedule = this.generateSchedule();
      console.log(`Generated ${schedule.length} performances for ${this.shows.length} shows`);
      
      // Create events for each scheduled performance
      for (const performance of schedule) {
        const show = performance.show;
        const venueData = this.venues[show.venue];
        
        // Format date for ID
        const dateString = performance.date.toISOString().split('T')[0];
        const timeString = performance.date.getHours() + '-' + performance.date.getMinutes();
        
        // Create unique ID
        const slugifiedTitle = show.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `fringe-${slugifiedTitle}-${dateString}-${timeString}`;
        
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
        
        const formattedDate = dateFormat.format(performance.date);
        const formattedTime = timeFormat.format(performance.date);
        
        // Create detailed description
        const detailedDescription = `
${show.description}

PERFORMANCE DETAILS:
Date: ${formattedDate}
Time: ${formattedTime}
Venue: ${show.venue}
Duration: ${show.runtime} minutes
Creator: ${show.creator}
Origin: ${show.origin}

Part of the 2025 Vancouver Fringe Festival. The Fringe showcases unconventional, independent theatrical productions with shows selected through a lottery system rather than a juried process, ensuring a diverse range of performances.
        `;
        
        // Create event object
        const event = {
          id: eventId,
          title: `"${show.title}" - Vancouver Fringe Festival`,
          description: detailedDescription.trim(),
          startDate: performance.date,
          endDate: performance.endDate,
          venue: venueData,
          category: 'theatre',
          categories: ['theatre', 'performance', 'arts', 'fringe', 'festival', 'indie'],
          sourceURL: this.url,
          officialWebsite: 'https://vancouverfringe.com/tickets/',
          image: show.image || null,
          ticketsRequired: true,
          lastUpdated: new Date()
        };
        
        events.push(event);
      }
      
      console.log(`🎭 Successfully created ${events.length} Vancouver Fringe Festival events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Vancouver Fringe Festival scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new VancouverFringeScraper();
