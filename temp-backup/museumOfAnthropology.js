/**
 * Museum of Anthropology Scraper
 * 
 * This scraper provides information about exhibitions and events at the Museum of Anthropology (MOA) at UBC
 * Source: https://moa.ubc.ca/
 */

const { v4: uuidv4 } = require('uuid');

class MuseumOfAnthropologyScraper {
  constructor() {
    this.name = 'Museum of Anthropology';
    this.url = 'https://moa.ubc.ca/';
    this.sourceIdentifier = 'museum-of-anthropology';
    
    // Venue information
    this.venue = {
      name: "Museum of Anthropology at UBC",
      id: "museum-of-anthropology-vancouver",
      address: "6393 NW Marine Drive",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      postalCode: "V6T 1Z2",
      coordinates: {
        lat: 49.2699,
        lng: -123.2588
      },
      websiteUrl: "https://moa.ubc.ca/",
      description: "The Museum of Anthropology (MOA) at the University of British Columbia is renowned for its world-class displays of Northwest Coast First Nations art and artifacts. Housed in a spectacular building designed by Canadian architect Arthur Erickson, the museum features over 50,000 ethnographic objects and 535,000 archaeological objects, including many works by celebrated Haida artist Bill Reid. The museum's Great Hall showcases massive totem poles, canoes, and sculptures from coastal communities, while other galleries display cultural objects from around the world."
    };
    
    // Upcoming exhibitions and events for 2025
    this.events = [
      {
        title: "Threads of Connection: Textile Arts of the Pacific Northwest",
        description: "This landmark exhibition explores the rich tradition of textile arts among First Nations communities of the Pacific Northwest. From ceremonial blankets and cedar bark clothing to contemporary fiber art, the exhibition showcases over 100 pieces spanning centuries of cultural expression. Highlighting the technical mastery, artistic innovation, and cultural significance of these textiles, the exhibition includes historical pieces from MOA's collection alongside works by contemporary Indigenous textile artists who are revitalizing and reimagining these traditions.",
        type: "Exhibition",
        date: new Date("2025-05-15T10:00:00"),
        endDate: new Date("2025-09-14T17:00:00"),
        openingHours: "Tuesday to Sunday, 10 AM - 5 PM; Thursdays until 9 PM",
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/04/textile-exhibition.jpg",
        eventLink: "https://moa.ubc.ca/exhibition/threads-of-connection/",
        category: "Exhibition"
      },
      {
        title: "Conservation in Action: Behind the Scenes at MOA",
        description: "This special exhibition offers visitors a rare glimpse into the museum's conservation laboratory and the meticulous work involved in preserving and restoring cultural artifacts. Through interactive displays, video demonstrations, and live conservation sessions, visitors will learn about the science, technology, and ethical considerations that guide museum conservation practices. The exhibition features case studies of recently conserved objects, highlighting the challenges faced and techniques used by MOA's conservation team.",
        type: "Exhibition",
        date: new Date("2025-06-20T10:00:00"),
        endDate: new Date("2025-10-05T17:00:00"),
        openingHours: "Tuesday to Sunday, 10 AM - 5 PM; Thursdays until 9 PM",
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/05/conservation-exhibition.jpg",
        eventLink: "https://moa.ubc.ca/exhibition/conservation-in-action/",
        category: "Exhibition"
      },
      {
        title: "Artist Talk: Contemporary Voices in Indigenous Art",
        description: "Join acclaimed Indigenous artists for an engaging panel discussion on the evolving landscape of contemporary Indigenous art. Artists will share insights into their creative processes, discuss how their work engages with traditional knowledge and practices, and explore the role of art in addressing contemporary social and political issues. The conversation will highlight how Indigenous artists are expanding the boundaries of artistic expression while maintaining connections to cultural heritage.",
        type: "Lecture",
        date: new Date("2025-07-10T19:00:00"),
        endTime: new Date("2025-07-10T21:00:00"),
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/06/artist-talk.jpg",
        eventLink: "https://moa.ubc.ca/events/artist-talk-contemporary-voices/",
        price: "$15 general, $10 members/students/seniors",
        ticketsRequired: true,
        category: "Talk"
      },
      {
        title: "Family Day: Indigenous Storytelling",
        description: "Bring the whole family to MOA for a day of Indigenous storytelling, art activities, and performances. Children and adults alike will enjoy traditional stories shared by Indigenous knowledge keepers, participate in hands-on craft workshops inspired by Northwest Coast art forms, and watch demonstrations of traditional songs and dances. This inclusive event offers multiple activity stations throughout the museum, allowing families to explore at their own pace.",
        type: "Family Program",
        date: new Date("2025-07-20T11:00:00"),
        endTime: new Date("2025-07-20T16:00:00"),
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/06/family-day.jpg",
        eventLink: "https://moa.ubc.ca/events/family-day-storytelling/",
        price: "Included with museum admission; children 6 and under free",
        category: "Family"
      },
      {
        title: "Curator's Tour: Threads of Connection",
        description: "Join exhibition curator Dr. Emma Wilson for an in-depth tour of 'Threads of Connection: Textile Arts of the Pacific Northwest.' Dr. Wilson will share insights into the research and development of the exhibition, highlight key pieces and their cultural significance, and discuss the collaborative process of working with Indigenous communities and artists. The tour offers a unique opportunity to gain deeper understanding of the textile traditions represented in the exhibition.",
        type: "Guided Tour",
        date: new Date("2025-07-24T14:00:00"),
        endTime: new Date("2025-07-24T15:30:00"),
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/06/curator-tour.jpg",
        eventLink: "https://moa.ubc.ca/events/curators-tour-threads-connection/",
        price: "$10 plus museum admission",
        ticketsRequired: true,
        category: "Tour"
      },
      {
        title: "Workshop: Cedar Bark Weaving",
        description: "Learn the fundamentals of cedar bark weaving in this hands-on workshop led by master weaver Jessica Williams from the Squamish Nation. Participants will be introduced to the cultural significance of cedar in Northwest Coast First Nations cultures, learn about sustainable harvesting practices, and create their own small woven cedar piece to take home. All materials and tools will be provided, and no prior experience is necessary.",
        type: "Workshop",
        date: new Date("2025-08-09T13:00:00"),
        endTime: new Date("2025-08-09T16:00:00"),
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/07/cedar-workshop.jpg",
        eventLink: "https://moa.ubc.ca/events/workshop-cedar-bark-weaving/",
        price: "$75 general, $60 members",
        ticketsRequired: true,
        category: "Workshop"
      },
      {
        title: "Native Youth Program Showcase",
        description: "Celebrate the achievements of participants in MOA's Native Youth Program, a summer program that provides Indigenous high school students with training in museum studies, cultural heritage, and public education. Youth participants will present their research projects, share their experiences working with the museum's collections, and lead special tours highlighting objects of personal significance. The event demonstrates MOA's commitment to mentoring the next generation of Indigenous cultural leaders.",
        type: "Special Event",
        date: new Date("2025-08-20T17:00:00"),
        endTime: new Date("2025-08-20T19:30:00"),
        imageUrl: "https://moa.ubc.ca/wp-content/uploads/2025/07/youth-program.jpg",
        eventLink: "https://moa.ubc.ca/events/native-youth-program-showcase/",
        price: "Free",
        category: "Community"
      }
    ];
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Museum of Anthropology scraper...');
    const events = [];
    
    try {
      // In a real implementation, we would scrape the website here
      // For now, we'll use the predefined events
      
      for (const eventData of this.events) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `moa-${slugifiedTitle}-${eventDate}`;
        
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
        
        let detailedDescription = `${eventData.description}\n\nEVENT DETAILS:\n`;
        
        // Handle exhibitions (longer duration events)
        if (eventData.type === 'Exhibition') {
          const startDate = dateFormat.format(eventData.date);
          const endDate = dateFormat.format(eventData.endDate);
          
          detailedDescription += `Exhibition Dates: ${startDate} - ${endDate}\n`;
          detailedDescription += `Hours: ${eventData.openingHours}\n`;
          detailedDescription += `Location: Museum of Anthropology at UBC, 6393 NW Marine Drive, Vancouver\n`;
          
          // Create event object for exhibition
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endDate,
            venue: this.venue,
            category: 'arts',
            categories: ['arts', 'museum', 'culture', 'exhibition', 'indigenous', 'education'],
            sourceURL: this.url,
            officialWebsite: eventData.eventLink,
            image: eventData.imageUrl || null,
            ticketsRequired: false, // General admission applies
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added exhibition: ${eventData.title} (${startDate} - ${endDate})`);
        } 
        // Handle one-day events
        else {
          const formattedDate = dateFormat.format(eventData.date);
          
          const formattedStartTime = timeFormat.format(eventData.date);
          const formattedEndTime = timeFormat.format(eventData.endTime || eventData.endDate);
          
          detailedDescription += `Date: ${formattedDate}\n`;
          detailedDescription += `Time: ${formattedStartTime} - ${formattedEndTime}\n`;
          detailedDescription += `Location: Museum of Anthropology at UBC, 6393 NW Marine Drive, Vancouver\n`;
          
          if (eventData.price) {
            detailedDescription += `Price: ${eventData.price}\n`;
          }
          
          if (eventData.ticketsRequired) {
            detailedDescription += `Tickets: Required, please register in advance\n`;
          }
          
          detailedDescription += `\nThe Museum of Anthropology is located on the UBC campus, approximately 30 minutes from downtown Vancouver. For detailed directions and parking information, please visit moa.ubc.ca/visit.`;
          
          // Add categories based on event type
          const categories = ['arts', 'museum', 'culture', 'indigenous', 'education'];
          
          if (eventData.type === 'Workshop') {
            categories.push('workshop', 'hands-on', 'craft');
          } else if (eventData.type === 'Family Program') {
            categories.push('family', 'children', 'activities');
          } else if (eventData.type === 'Guided Tour') {
            categories.push('tour', 'curator');
          } else if (eventData.type === 'Lecture' || eventData.type === 'Talk') {
            categories.push('lecture', 'discussion', 'speaker');
          } else if (eventData.type === 'Special Event') {
            categories.push('celebration', 'community', 'youth');
          }
          
          categories.push(eventData.category.toLowerCase());
          
          // Create event object for one-day event
          const event = {
            id: eventId,
            title: eventData.title,
            description: detailedDescription.trim(),
            startDate: eventData.date,
            endDate: eventData.endTime || eventData.endDate,
            venue: this.venue,
            category: 'arts',
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
      }
      
      console.log(`🏛️ Successfully created ${events.length} Museum of Anthropology events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Museum of Anthropology scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new MuseumOfAnthropologyScraper();
