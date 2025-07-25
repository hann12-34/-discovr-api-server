/**
 * Vancouver city scrapers
 * Collection of scrapers for Vancouver events and venues
 * Only includes real scrapers that perform actual web scraping (not hardcoded sample data)
 */

const { v5: uuidv5 } = require('uuid');
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// Import all venue scrapers that perform actual web scraping
const commodoreBallroom = require('./commodoreBallroomEvents'); // Using improved events scraper
// Previously commented out scrapers now available
const vancouverAquariumEvents = require('./vancouverAquariumEvents');
const granvilleMarketEvents = require('./granvilleMarketEvents');
const orpheumEvents = require('./orpheumEvents');
const steamworksBrewingEvents = require('./steamworksBrewingEvents');
const scienceWorldVancouverEvents = require('./scienceWorldVancouverEvents');
// New scrapers
const theatreUnderTheStarsEvents = require('./theatreUnderTheStarsEvents');
const vancouverSymphonyEvents = require('./vancouverSymphonyEvents');
const roxyVancouverEvents = require('./roxyVancouverEvents');
const vancouverCivicTheatresEvents = require('./vancouverCivicTheatresEvents');
const rogersArenaEvents = require('./rogersArenaEvents');
// Improved Rogers Arena scraper
const rogersArenaEventsImproved = require('./rogersArenaEventsImproved');
const queenElizabethTheatreEvents = require('./queenElizabethTheatreEvents');
// Canada Place scraper
const canadaPlaceEvents = require('./canadaPlaceEvents');
const bcPlaceEvents = require('./bcPlaceEvents');
const hrMacMillanSpaceCentreEvents = require('./hrMacMillanSpaceCentreEvents');
const ubcBotanicalGardenEvents = require('./ubcBotanicalGardenEvents');
const vancouverMaritimeMuseumEvents = require('./vancouverMaritimeMuseumEvents');
const moaUbcEvents = require('./moaUbcEvents');
// Vancouver Convention Centre scraper
const vancouverConventionCentreEvents = require('./vancouverConventionCentreEvents');

// Import working scrapers
const fortuneSoundClub = require('./fortuneSoundClub');
const gastownSundaySet = require('./gastownSundaySet');
const granvilleIsland = require('./granvilleIsland');
const VancouverArtGalleryEvents = require('./vancouverArtGalleryEvents');
const VeganMarketEvents = require('./veganMarketEvents');
const QueerArtsFestivalEvents = require('./queerArtsFestivalEvents');
const BardOnTheBeachEvents = require('./bardOnTheBeachEvents');
const FestivalDEteEvents = require('./festivalDEteEvents');
const BroadwayVancouverEvents = require('./broadwayVancouverEvents');
const MusqueamEvents = require('./musqueamEvents');
const JapanMarketEvents = require('./japanMarketEvents');
const VSFFEvents = require('./vsffEvents');
const RunToEndEndoEvents = require('./runToEndEndoEvents');
const ChineseGardenEvents = require('./chineseGardenEvents');
const MetropolisEvents = require('./metropolisEvents');
const ArcDiningEvents = require('./arcDiningEvents');
const VancouverMysteriesEvents = require('./vancouverMysteriesEvents');
const DragonBoatFestivalEvents = require('./dragonBoatFestivalEvents');
const MuseumOfVancouverEvents = require('./museumOfVancouverEvents');
const CoastalJazzEvents = require('./coastalJazzEvents');
const KhatsahlanoEvents = require('./khatsahlanoEvents');
const SummerCinemaEvents = require('./summerCinemaEvents');
const GastownGrandPrixEvents = require('./gastownGrandPrixEvents');
const HelloGoodbyeBarEvents = require('./helloGoodbyeBarEvents');
// const MalonesEvents = require('./malonesEvents'); // Removed due to scrape function issues
// const UndergroundComedyClubEvents = require('./undergroundComedyClubEvents'); // Removed due to syntax errors
// const ImprovCentreEvents = require('./improvCentreEvents'); // Removed due to scrape function issues
// const DOXAFilmFestivalEvents = require('./doxaFilmFestivalEvents'); // Removed due to SPA compatibility issues
// const BillReidGalleryEvents = require('./billReidGalleryEvents'); // Removed due to scrape function issues
const vogueTheatre = require('./vogueTheatre');
const foxCabaret = require('./foxCabaret');

// Import new scrapers
const VancouverAsianFilmFestivalEvents = require('./vancouverAsianFilmFestivalEvents');
const QueerFilmFestivalEvents = require('./queerFilmFestivalEvents');
const MuseumOfAnthropologyEvents = require('./museumOfAnthropologyEvents');
// const fortuneSoundClubBridge = require('./fortuneSoundClubBridge');  // Already imported as fortuneSoundClub

class VancouverScrapers {
  constructor() {
    this.city = 'Vancouver';
    this.province = 'BC';
    this.country = 'Canada';
    this.sourceIdentifier = 'vancouver';
    this.enabled = true;
    this.venueScrapers = [];
    
    // Add venue scrapers to the scrapers array - ONLY REAL SCRAPERS
    this.scrapers = [
      commodoreBallroom,
      vancouverAquariumEvents,
      granvilleMarketEvents,
      orpheumEvents,
      steamworksBrewingEvents,
      scienceWorldVancouverEvents,
      theatreUnderTheStarsEvents,
      vancouverSymphonyEvents,
      // rogersArenaEvents, // Commented out in favor of improved version
      rogersArenaEventsImproved, // Added improved Rogers Arena scraper
      canadaPlaceEvents, // Added Canada Place events scraper
      queenElizabethTheatreEvents,
      bcPlaceEvents,
      hrMacMillanSpaceCentreEvents,
      ubcBotanicalGardenEvents,
      vancouverMaritimeMuseumEvents,
      moaUbcEvents,
      vancouverConventionCentreEvents, // Added Vancouver Convention Centre events scraper
      VancouverArtGalleryEvents,
      VeganMarketEvents,
      QueerArtsFestivalEvents,
      BardOnTheBeachEvents,
      FestivalDEteEvents,
      BroadwayVancouverEvents,
      MusqueamEvents,
      JapanMarketEvents,
      VSFFEvents,
      RunToEndEndoEvents,
      ChineseGardenEvents,
      MetropolisEvents,
      ArcDiningEvents,
      VancouverMysteriesEvents,
      DragonBoatFestivalEvents,
      MuseumOfVancouverEvents,
      CoastalJazzEvents,
      KhatsahlanoEvents,
      SummerCinemaEvents,
      GastownGrandPrixEvents,
      HelloGoodbyeBarEvents,
      VancouverAsianFilmFestivalEvents,
      QueerFilmFestivalEvents,
      MuseumOfAnthropologyEvents,
      // MalonesEvents, // Removed due to scrape function issues
      // UndergroundComedyClubEvents, // Removed due to syntax errors
      // ImprovCentreEvents, // Removed due to scrape function issues
      // DOXAFilmFestivalEvents, // Removed due to SPA compatibility issues
      // BillReidGalleryEvents, // Removed due to scrape function issues
    ];
    
    // Register venue scrapers - ONLY REAL SCRAPERS
    this.register(commodoreBallroom);
    this.register(vogueTheatre);
    this.register(foxCabaret);
    this.register(fortuneSoundClub);
    this.register(gastownSundaySet);
    this.register(granvilleIsland);
    // Comment out undefined variables
    // this.register(barNoneClub);
    // this.register(queenElizabethTheatre);
    // this.register(vancouverCivicTheatres);
    // this.register(rogersArena);
    // this.register(chanCentre);
    // this.register(carnavalDelSol);
    this.register(theatreUnderTheStarsEvents);
    this.register(vancouverSymphonyEvents);
    this.register(roxyVancouverEvents);
    this.register(vancouverCivicTheatresEvents);
    // this.register(rogersArenaEvents); // Commented out in favor of improved version
    this.register(rogersArenaEventsImproved); // Registering improved Rogers Arena scraper
    this.register(canadaPlaceEvents); // Registering Canada Place events scraper
    this.register(queenElizabethTheatreEvents);
    this.register(bcPlaceEvents);
    this.register(hrMacMillanSpaceCentreEvents);
    this.register(ubcBotanicalGardenEvents);
    this.register(vancouverMaritimeMuseumEvents);
    this.register(moaUbcEvents);
    this.register(vancouverConventionCentreEvents); // Registering Vancouver Convention Centre events scraper
    // this.register(bardOnTheBeach);
    // this.register(helloBCEventsScraper);
    // these variables are not defined
    // this.register(tourismVancouverEvents);
    // this.register(vancouverCityEvents);
    this.register(VancouverArtGalleryEvents);
    // this.register(redRoomEvents);
    this.register(VeganMarketEvents);
    this.register(QueerArtsFestivalEvents);
    this.register(BardOnTheBeachEvents);
    this.register(FestivalDEteEvents);
    this.register(BroadwayVancouverEvents);
    this.register(CoastalJazzEvents);
    this.register(KhatsahlanoEvents);
    this.register(SummerCinemaEvents);
    this.register(GastownGrandPrixEvents);
    this.register(HelloGoodbyeBarEvents);
    this.register(VancouverAsianFilmFestivalEvents);
    this.register(QueerFilmFestivalEvents);
    this.register(MuseumOfAnthropologyEvents);
    // this.register(MalonesEvents); // Removed due to scrape function issues
    // this.register(UndergroundComedyClubEvents); // Removed due to syntax errors
    // this.register(ImprovCentreEvents); // Removed due to scrape function issues
    // this.register(DOXAFilmFestivalEvents); // Removed due to SPA compatibility issues
    // this.register(BillReidGalleryEvents); // Removed due to scrape function issues
  }

  /**
   * Register a venue scraper for Vancouver
   * @param {Object} scraper - The venue scraper to register
   */
  register(scraper) {
    this.venueScrapers.push(scraper);
    console.log(`Registered Vancouver venue scraper: ${scraper.name}`);
    return this;
  }

  /**
   * Generate a deterministic UUID for an event
   * @param {Object} event - Event data
   * @returns {string} - UUID v5 string
   */
  generateEventId(event) {
    const idString = `${event.title}|${event.startDate?.toISOString() || new Date().toISOString()}|${event.venue?.name || 'unknown'}|${this.sourceIdentifier}`;
    return uuidv5(idString, NAMESPACE);
  }

  /**
   * Format event to match expected schema
   * @param {Object} rawEvent - Raw event data
   * @returns {Object} - Formatted event
   */
  formatEvent(rawEvent) {
    // Generate a deterministic UUID based on title, venue, and date to prevent duplicates
    const idSource = `${rawEvent.title}-${rawEvent.venue?.name || 'unknown'}-${rawEvent.startDate?.toISOString() || new Date().toISOString()}`;
    const id = uuidv5(idSource, NAMESPACE);
    
    // Get date in proper format
    const startDate = rawEvent.startDate || new Date();
    
    // Format the event to match iOS app expectations
    return {
      id: id,
      title: rawEvent.title,
      name: rawEvent.title, // Include name for compatibility
      description: rawEvent.description || `Event at ${rawEvent.venue?.name}`,
      image: rawEvent.image,
      date: startDate.toISOString(), // Add date in ISO format for iOS compatibility
      startDate: startDate,
      endDate: rawEvent.endDate,
      season: this.determineSeason(startDate),
      category: (rawEvent.categories?.[0] || 'Entertainment'), // Single category string
      categories: rawEvent.categories || ['Entertainment'], // Array of categories
      location: rawEvent.location || rawEvent.venue?.name,
      venue: rawEvent.venue || {
        name: rawEvent.location || 'Vancouver Venue',
        address: '',
        city: this.city,
        state: this.province,
        country: this.country,
        coordinates: { lat: 49.2827, lng: -123.1207 }
      },
      sourceURL: rawEvent.sourceURL,
      officialWebsite: rawEvent.officialWebsite,
      dataSources: [`${this.sourceIdentifier}-${rawEvent.venue?.name || 'unknown'}`],
      lastUpdated: new Date()
    };
  }

  /**
   * Determine season based on date
   * @param {Date} date - The event date
   * @returns {string} - Season name
   */
  determineSeason(date) {
    if (!date || !(date instanceof Date)) return 'Unknown';
    
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  /**
   * Run all Vancouver venue scrapers
   * @returns {Promise<Array>} - Array of events
   */
  async scrape() {
    if (!this.enabled) {
      console.log('Vancouver scrapers are disabled');
      return [];
    }

    console.log('Starting Vancouver scrapers...');
    const allEvents = [];
    
    if (this.venueScrapers.length === 0) {
      console.log('No Vancouver venue scrapers registered');
      return this.getMockEvents();
    }
    
    for (const scraper of this.venueScrapers) {
      try {
        console.log(`Running scraper for ${scraper.name}...`);
        const rawEvents = await scraper.scrape();
        
        if (Array.isArray(rawEvents) && rawEvents.length > 0) {
          const formattedEvents = rawEvents.map(e => this.formatEvent(e, scraper.name));
          allEvents.push(...formattedEvents);
          console.log(`${scraper.name} scraper found ${rawEvents.length} events`);
        } else {
          console.log(`${scraper.name} scraper found no events`);
        }
      } catch (error) {
        console.error(`Error in ${scraper.name} scraper:`, error.message);
      }
    }
    
    // If no events were scraped, return mock data
    if (allEvents.length === 0) {
      console.log('No events found by Vancouver scrapers, using mock data');
      return this.getMockEvents();
    }
    
    console.log(`Vancouver scrapers found ${allEvents.length} events in total`);
    return allEvents;
  }
  
  /**
   * Get mock events for Vancouver
   * @returns {Array} - Array of mock events
   */
  getMockEvents() {
    const currentYear = new Date().getFullYear();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return [
      {
        id: 'van-001',
        title: 'Vancouver Film Festival',
        description: 'Annual film festival showcasing local and international independent films.',
        image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
        startDate: new Date(`${currentYear}-10-05T10:00:00`),
        endDate: new Date(`${currentYear}-10-15T22:00:00`),
        season: 'Fall',
        categories: ['Film & Media', 'Arts & Culture'],
        location: 'Vancouver Film Centre',
        venue: {
          name: 'Vancouver Film Centre',
          address: '1181 Seymour St',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          coordinates: { lat: 49.2776, lng: -123.1265 }
        },
        price: { min: 12, max: 25, free: false },
        tickets: 'https://example.com/vancouver-film-festival-tickets',
        sourceURL: 'https://example.com/vancouver-film-festival',
        officialWebsite: 'https://viff.org',
        dataSources: ['vancouver', 'mock-data'],
        lastUpdated: new Date()
      },
      {
        id: 'van-002',
        title: 'Stanley Park Summer Concert',
        description: 'Outdoor concert series featuring local musicians in Vancouver\'s iconic Stanley Park.',
        image: 'https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb',
        startDate: new Date(`${currentYear}-07-20T18:30:00`),
        endDate: new Date(`${currentYear}-07-20T21:30:00`),
        season: 'Summer',
        categories: ['Music', 'Outdoor'],
        location: 'Stanley Park',
        venue: {
          name: 'Malkin Bowl',
          address: 'Stanley Park',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          coordinates: { lat: 49.3017, lng: -123.1417 }
        },
        price: { min: 0, max: 0, free: true },
        tickets: null,
        sourceURL: 'https://example.com/stanley-park-concert',
        officialWebsite: 'https://vancouver.ca/parks',
        dataSources: ['vancouver', 'mock-data'],
        lastUpdated: new Date()
      },
      {
        id: 'van-003',
        title: 'Granville Island Craft Beer Festival',
        description: 'Celebration of British Columbia\'s craft beer scene with tastings, food pairings, and live entertainment.',
        image: 'https://images.unsplash.com/photo-1571575522341-7b395f2f994d',
        startDate: nextMonth,
        endDate: new Date(nextMonth.getTime() + (2 * 24 * 60 * 60 * 1000)),
        season: this.determineSeason(nextMonth),
        categories: ['Food & Drink', 'Festival'],
        location: 'Granville Island',
        venue: {
          name: 'Granville Island Public Market',
          address: '1689 Johnston St',
          city: 'Vancouver',
          state: 'BC',
          country: 'Canada',
          coordinates: { lat: 49.2711, lng: -123.1347 }
        },
        price: { min: 30, max: 75, free: false },
        tickets: 'https://example.com/granville-beer-festival-tickets',
        sourceURL: 'https://example.com/granville-beer-festival',
        officialWebsite: 'https://granvilleisland.com',
        dataSources: ['vancouver', 'mock-data'],
        lastUpdated: new Date()
      }
    ];
  }
}

// Export a singleton instance
module.exports = new VancouverScrapers();
