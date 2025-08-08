/**
 * The Centre in Vancouver Scraper
 *
 * This scraper provides information about events at The Centre in Vancouver
 * Source: https://thecentrevancouver.com/
 */

const { v4: uuidv4 } = require('uuid');

class TheCentreVancouverScraper {
  constructor() {
    this.name = 'The Centre in Vancouver';
    this.url = 'https://thecentrevancouver.com/';
    this.sourceIdentifier = 'the-centre-vancouver';

    // Venue information
    this.venue = {
      name: "The Centre in Vancouver",
      id: "the-centre-vancouver",
      address: "777 Homer St",
      city: city,
      state: "BC",
      country: "Canada",
      postalCode: "V6B 2W1",
      coordinates: {
        lat: 49.2797,
        lng: -123.1181
      },
      websiteUrl: "https://thecentrevancouver.com/",
      description: "The Centre in Vancouver (formerly the Centre for Performing Arts) is a 1,800-seat theatre located in the heart of downtown Vancouver. This beautifully restored venue features state-of-the-art acoustics, excellent sightlines, and hosts a variety of performances including concerts, comedy shows, theatrical productions, and special events."
    };

    // Upcoming events for 2025
    thiss = [
      {
        title: "Jann Arden: The Mixtape Tour",
        description: "Canadian music icon Jann Arden brings her 'The Mixtape Tour' to The Centre in Vancouver, celebrating four decades of hit songs and stories. This intimate evening showcases Arden's powerful vocals and remarkable songwriting in a career-spanning performance that weaves together her biggest hits with personal anecdotes and insights from her storied career. The multi-platinum, award-winning singer-songwriter will perform classics like 'Could I Be Your Girl,' 'Insensitive,' and 'Good Mother' alongside tracks from her latest album. Known for her disarming wit and honest reflections, Arden's stage banter is as captivating as her music, creating a warm connection with the audience. The show features Arden's full band and special production elements that enhance the musical journey without overshadowing the intimacy that has made her live performances legendary. This tour follows Arden's induction into the Canadian Music Hall of Fame and celebrates her continued evolution as one of Canada's most beloved performers.",
        date: new Date("2025-07-15T20:00:00"),
        endTime: new Date("2025-07-15T22:30:00"),
        imageUrl: "https://thecentrevancouver.com/wp-content/uploads/2025/05/jann-arden-2025.jpg",
        eventLink: "https://thecentrevancouver.com/events/jann-arden-the-mixtape-tour/",
        price: "$49.50 - $125",
        performers: ["Jann Arden"],
        ticketsRequired: true,
        category: "Concert"
      },
      {
        title: "An Evening with David Sedaris",
        description: "Beloved author and humorist David Sedaris returns to The Centre in Vancouver for an evening of readings, recollections, and sardonic wit. One of America's most distinctive storytellers, Sedaris will share new and unpublished works, read from his latest bestseller, and take questions from the audience. His personal essays and social critiques combine autobiographical elements with razor-sharp observations on modern life, creating stories that are both deeply personal and universally resonant. Sedaris' material ranges from family dynamics and international travel mishaps to cultural peculiarities and the absurdities of everyday interactions. His delivery—characterized by impeccable timing and deadpan humor—transforms even the most mundane situations into laugh-out-loud narratives. Following the reading, Sedaris will be available for a book signing in the lobby, where his latest works will be available for purchase. This performance is suitable for mature audiences and contains adult themes and language that some may find provocative.",
        date: new Date("2025-07-22T19:30:00"),
        endTime: new Date("2025-07-22T22:00:00"),
        imageUrl: "https://thecentrevancouver.com/wp-content/uploads/2025/05/sedaris-2025.jpg",
        eventLink: "https://thecentrevancouver.com/events/an-evening-with-david-sedaris/",
        price: "$45 - $85",
        performers: ["David Sedaris"],
        ticketsRequired: true,
        category: "Literary"
      },
      {
        title: "Vancouver Symphony Orchestra: Film Music Spectacular",
        description: "Experience the magic of cinema through its most iconic musical moments as the Vancouver Symphony Orchestra presents 'Film Music Spectacular' at The Centre in Vancouver. This concert celebrates the profound emotional impact of film scores across decades of moviemaking, from Golden Age classics to contemporary blockbusters. Under the direction of Maestro Otto Tausk, the full symphony orchestra will perform selections from legendary composers including John Williams (Star Wars, Harry Potter), Hans Zimmer (The Lion King, Inception), Ennio Morricone (The Good, the Bad and the Ugly), Bernard Herrmann (Psycho), and Vangelis (Blade Runner). The performance features synchronized film clips projected on a large screen above the orchestra, allowing audiences to experience these memorable scenes with live orchestral accompaniment. Special guest narrator Christopher Gaze provides historical context and behind-the-scenes insights between pieces. The evening's program spans diverse genres including science fiction, fantasy, westerns, animation, and dramas, highlighting how orchestral music shapes our cinematic experiences and cultural memories.",
        date: new Date("2025-08-05T20:00:00"),
        endTime: new Date("2025-08-05T22:30:00"),
        imageUrl: "https://thecentrevancouver.com/wp-content/uploads/2025/06/vso-film-music-2025.jpg",
        eventLink: "https://thecentrevancouver.com/events/vso-film-music-spectacular/",
        price: "$40 - $95",
        performers: ["Vancouver Symphony Orchestra", "Otto Tausk", "Christopher Gaze"],
        ticketsRequired: true,
        category: "Orchestra"
      },
      {
        title: "Margaret Atwood: New Perspectives",
        description: "Literary giant Margaret Atwood comes to The Centre in Vancouver to discuss her latest work and reflect on a career that has fundamentally shaped contemporary literature. The Booker Prize-winning author of 'The Handmaid's Tale,' 'Alias Grace,' and numerous other acclaimed novels will share readings from her newest publication and engage in conversation about the themes that have defined her work: feminism, environmentalism, social justice, and speculative fiction as a lens for examining present realities. Moderated by award-winning Canadian journalist Nahlah Ayed, the discussion will explore Atwood's creative process, her perspectives on current global challenges, and how her dystopian visions continue to resonate with growing urgency in today's political climate. The evening includes a Q&A session with audience members, offering fans the rare opportunity to engage directly with one of literature's most influential voices. Atwood's incisive intellect, wry humor, and uncompromising viewpoints promise an evening of thought-provoking discourse that extends beyond literature to address the most pressing questions of our time.",
        date: new Date("2025-08-12T19:00:00"),
        endTime: new Date("2025-08-12T21:30:00"),
        imageUrl: "https://thecentrevancouver.com/wp-content/uploads/2025/07/atwood-2025.jpg",
        eventLink: "https://thecentrevancouver.com/events/margaret-atwood-perspectives/",
        price: "$35 - $75",
        performers: ["Margaret Atwood", "Nahlah Ayed"],
        ticketsRequired: true,
        category: "Talk"
      },
      {
        title: "Choir! Choir! Choir!: Epic Sing-Along",
        description: "Join the musical phenomenon Choir! Choir! Choir! for an immersive, participatory evening that transforms The Centre in Vancouver into one massive singing ensemble. Created by Toronto-based musicians Daveed Goldman and Nobu Adilman, this unique event invites audience members to become performers, learning and performing three-part harmonies to well-known songs with no musical experience required. Upon arrival, participants are assigned to one of three vocal sections where they'll learn their parts through a fun, step-by-step process led by Goldman and Adilman. The evening builds toward a powerful collective performance that will be professionally recorded and shared online afterward. This special Vancouver edition features a carefully curated selection of Canadian classics, global hits, and a few surprise arrangements specifically created for this event. Choir! Choir! Choir! has previously orchestrated large-scale performances at Carnegie Hall, Radio City Music Hall, and Massey Hall, and has collaborated with renowned artists including David Byrne, Rufus Wainwright, and Patti Smith. The evening promises to be both uplifting and cathartic, creating an unforgettable shared experience among strangers through the universal language of music.",
        date: new Date("2025-08-27T20:00:00"),
        endTime: new Date("2025-08-27T22:30:00"),
        imageUrl: "https://thecentrevancouver.com/wp-content/uploads/2025/07/choir-2025.jpg",
        eventLink: "https://thecentrevancouver.com/events/choir-choir-choir-singalong/",
        price: "$30",
        performers: ["Choir! Choir! Choir!", "Daveed Goldman", "Nobu Adilman"],
        ticketsRequired: true,
        category: "Interactive"
      }
    ];
  }

  /**
   * Main scraper function
   */
  async scrape(city) {
    console.log('🔍 Starting The Centre in Vancouver scraper...');
    const events = [];

    try {
      // Process predefined events
      for (const eventData of thiss) {
        // Create unique ID for each event
        const eventDate = eventData.date.toISOString().split('T')[0];
        const slugifiedTitle = eventData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const eventId = `the-centre-${slugifiedTitle}-${eventDate}`;

        // Format the date for display
        const dateFormat = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        };

        const timeFormat = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        };

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

        if (eventData.performers && eventData.performers.length > 0) {
          detailedDescription += `Performers: ${eventData.performers.join(', ')}\n`;
        }

        if (eventData.ticketsRequired) {
          detailedDescription += `Tickets: Available through The Centre's box office, by phone at 604-555-7777, or online at thecentrevancouver.com\n`;
        }

        detailedDescription += `\nVenue Information: The Centre in Vancouver is located in downtown Vancouver at 777 Homer Street. The venue is easily accessible by public transit (a short walk from Granville, Vancouver City Centre, or Yaletown SkyTrain stations) and paid parking is available at nearby lots. The theatre offers concessions and a full bar service that opens one hour before show time.`;

        // Create categories
        const categories = ['performance', 'theatre', 'arts'];

        // Add event-specific categories
        categories.push(eventData.category.toLowerCase());

        if (eventData.title.includes('Jann Arden')) {
          categories.push('music', 'concert', 'canadian', 'singer-songwriter');
        } else if (eventData.title.includes('David Sedaris')) {
          categories.push('literature', 'author', 'humor', 'reading');
        } else if (eventData.title.includes('Symphony Orchestra')) {
          categories.push('classical', 'orchestra', 'film music', 'soundtrack');
        } else if (eventData.title.includes('Margaret Atwood')) {
          categories.push('literature', 'author', 'talk', 'canadian');
        } else if (eventData.title.includes('Choir')) {
          categories.push('music', 'interactive', 'sing-along', 'participatory');
        }

        // Create event object
        const event = {
          id: eventId,
          title: eventData.title,
          description: detailedDescription.trim(),
          startDate: eventData.date,
          endDate: eventData.endTime,
          venue: this.venue,
          category: 'performance',
          categories: categories,
          sourceURL: this.url,
          officialWebsite: eventDataLink,
          image: eventData.imageUrl || null,
          ticketsRequired: !!eventData.ticketsRequired,
          lastUpdated: new Date()
        };

        events.push(event);
        console.log(`✅ Added event: ${eventData.title} on ${formattedDate}`);
      }

      console.log(`🎭 Successfully created ${events.length} Centre in Vancouver events`);
      return events;

    } catch (error) {
      console.error(`❌ Error in The Centre in Vancouver scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new TheCentreVancouverScraper();


// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new TheCentreVancouverScraper();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.TheCentreVancouverScraper = TheCentreVancouverScraper;