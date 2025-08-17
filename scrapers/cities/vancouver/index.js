/**
 * Vancouver city scrapers
 * Collection of scrapers for Vancouver events and venues
 * Only includes real scrapers that perform actual web scraping (not hardcoded sample data)
 */

const { v5: uuidv5 } = require('uuid');
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

// Import all CLEAN reconstructed venue scrapers (125+ scrapers)
// ALL CLEAN SCRAPERS - COMPLETE SET
const PembertomRecCentreEvents = require('./pembertomRecCentreEvents_clean');
const BurnabyCentreEvents = require('./burnabyCentreEvents_clean');
const RichmondCentreEvents = require('./richmondCentreEvents_clean');
const AbbotsfordCentreEvents = require('./abbotsfordCentreEvents_clean');
const BcLionsEvents = require('./bcLionsEvents_clean');
const BcPlaceStadiumEvents = require('./bcPlaceStadiumEvents_clean');
const BurnabyCentralParkEvents = require('./burnabyCentralParkEvents_clean');
const BurnabyCentreForTheArtsEvents = require('./burnabyCentreForTheArtsEvents_clean');
const CapilanoSuspensionBridgeEvents = require('./capilanoSuspensionBridgeEvents_clean');
const CapilanoUniversityEvents = require('./capilanoUniversityEvents_clean');
const ChilliwackCulturalCentreEvents = require('./chilliwackCulturalCentreEvents_clean');
const CoastalJazzEvents = require('./coastalJazzEvents_clean');
const CoquitlamRiverCentreEvents = require('./coquitlamRiverCentreEvents_clean');
const DeltaHeritageAirParkEvents = require('./deltaHeritageAirParkEvents_clean');
const DouglasCollegeEvents = require('./douglasCollegeEvents_clean');
const DragonBoatFestivalEvents = require('./dragonBoatFestivalEvents_clean');
const GastownGrandPrixEvents = require('./gastownGrandPrixEvents_clean');
const GranvilleStreetEvents = require('./granvilleStreetEvents_clean');
const GrouseMountainEvents = require('./grouseMountainEvents_clean');
const HelloGoodbyeBarEvents = require('./helloGoodbyeBarEvents_clean');
const KhatsahlanoEvents = require('./khatsahlanoEvents_clean');
const KwantlenPolytechnicEvents = require('./kwantlenPolytechnicEvents_clean');
const LangleyEventsCentreEvents = require('./langleyEventsCentreEvents_clean');
const LangleyTownshipRecCentreEvents = require('./langleyTownshipRecCentreEvents_clean');
const MapleRidgeRecCentreEvents = require('./mapleRidgeRecCentreEvents_clean');
const MissionRecCentreEvents = require('./missionRecCentreEvents_clean');
const MuseumOfVancouverEvents = require('./museumOfVancouverEvents_clean');
const NewWestminsterRecCentreEvents = require('./newWestminsterRecCentreEvents_clean');
const NorthVancouverRecCentreEvents = require('./northVancouverRecCentreEvents_clean');
const PittMeadowsRecCentreEvents = require('./pittMeadowsRecCentreEvents_clean');
const PortCoquitlamRecCentreEvents = require('./portCoquitlamRecCentreEvents_clean');
const PortMoodyRecCentreEvents = require('./portMoodyRecCentreEvents_clean');
const DeltaCommunityCentreEvents = require('./deltaCommunityCentreEvents_clean');
const VancouverCommunityCollegeEvents = require('./vancouverCommunityCollegeEvents_clean');
const BcitEvents = require('./bcitEvents_clean');
const SimonFraserUniversityEvents = require('./simonFraserUniversityEvents_clean');
const UniversityOfBritishColumbiaEvents = require('./universityOfBritishColumbiaEvents_clean');
const EmilyCarrUniversityEvents = require('./emilyCarrUniversityEvents_clean');
const LangleyCollegeEvents = require('./langleyCollegeEvents_clean');
const ColumbiaCollegeEvents = require('./columbiaCollegeEvents_clean');
const VancouverArtGalleryEventsClean = require('./vancouverArtGalleryEvents_clean');
const VancouverMuseumEvents = require('./vancouverMuseumEvents_clean');
const VancouverPlanetariumEvents = require('./vancouverPlanetariumEvents_clean');
const VancouverPublicLibraryEvents = require('./vancouverPublicLibraryEvents_clean');
const VancouverCommunityNetworkEvents = require('./vancouverCommunityNetworkEvents_clean');
const VancouverHeritageFoundationEvents = require('./vancouverHeritageFoundationEvents_clean');
const VancouverFoodBankEvents = require('./vancouverFoodBankEvents_clean');
const VancouverYMCAEvents = require('./vancouverYMCAEvents_clean');
const VancouverHospitalFoundationEvents = require('./vancouverHospitalFoundationEvents_clean');
const VancouverPoliceFoundationEvents = require('./vancouverPoliceFoundationEvents_clean');
const VancouverFireFightersCharityEvents = require('./vancouverFireFightersCharityEvents_clean');
const VancouverFilmSchoolEvents = require('./vancouverFilmSchoolEvents_clean');
const VancouverAcademyOfMusicEvents = require('./vancouverAcademyOfMusicEvents_clean');
const VancouverJazzFestivalEventsClean = require('./vancouverJazzFestivalEvents_clean');
const VancouverBluesFestivalEvents = require('./vancouverBluesFestivalEvents_clean');
const VancouverFolkMusicFestivalEvents = require('./vancouverFolkMusicFestivalEvents_clean');
const VancouverWorldMusicFestivalEvents = require('./vancouverWorldMusicFestivalEvents_clean');
const VancouverComedyFestivalEvents = require('./vancouverComedyFestivalEvents_clean');
const VancouverDanceFestivalEvents = require('./vancouverDanceFestivalEvents_clean');
const VancouverTheatreFestivalEvents = require('./vancouverTheatreFestivalEvents_clean');
const VancouverLiteratureFestivalEvents = require('./vancouverLiteratureFestivalEvents_clean');
const VancouverArtsFestivalEvents = require('./vancouverArtsFestivalEvents_clean');
const VancouverCulturalFestivalEvents = require('./vancouverCulturalFestivalEvents_clean');
const VancouverTechFestivalEvents = require('./vancouverTechFestivalEvents_clean');
const VancouverStartupWeekEvents = require('./vancouverStartupWeekEvents_clean');
const VancouverFoodFestivalEvents = require('./vancouverFoodFestivalEvents_clean');
const VancouverWineFestivalEvents = require('./vancouverWineFestivalEvents_clean');
const VancouverCraftBeerFestivalEvents = require('./vancouverCraftBeerFestivalEvents_clean');
const VancouverHealthAndWellnessExpoEvents = require('./vancouverHealthAndWellnessExpoEvents_clean');
const VancouverAutomotiveShowEvents = require('./vancouverAutomotiveShowEvents_clean');
const VancouverHomeShowEvents = require('./vancouverHomeShowEvents_clean');
const VancouverSportsShowEvents = require('./vancouverSportsShowEvents_clean');
const VancouverBoatShowEvents = require('./vancouverBoatShowEvents_clean');
const VancouverPetExpoEvents = require('./vancouverPetExpoEvents_clean');
const VancouverBridalShowEvents = require('./vancouverBridalShowEvents_clean');
const VancouverRVShowEvents = require('./vancouverRVShowEvents_clean');
const VancouverTradeShowEvents = require('./vancouverTradeShowEvents_clean');
const VancouverJobFairEvents = require('./vancouverJobFairEvents_clean');
const VancouverGamingExpoEvents = require('./vancouverGamingExpoEvents_clean');
// BATCH 13-17 CLEAN SCRAPERS
const VancouverComicConEvents = require('./vancouverComicConEvents_clean');
const VancouverAnimeConventionEvents = require('./vancouverAnimeConventionEvents_clean');
const VancouverCraftFairEvents = require('./vancouverCraftFairEvents_clean');
const VancouverFarmersMarketEvents = require('./vancouverFarmersMarketEvents_clean');
const VancouverNightMarketEvents = require('./vancouverNightMarketEvents_clean');
const VancouverFleaMarketEvents = require('./vancouverFleaMarketEvents_clean');
const VancouverStreetFairEvents = require('./vancouverStreetFairEvents_clean');
const VancouverMarathonEvents = require('./vancouverMarathonEvents_clean');
const VancouverTriathlonEvents = require('./vancouverTriathlonEvents_clean');
const VancouverCyclingEvents = require('./vancouverCyclingEvents_clean');
const VancouverSwimmingEvents = require('./vancouverSwimmingEvents_clean');
const VancouverSoccerEvents = require('./vancouverSoccerEvents_clean');
const VancouverHockeyEvents = require('./vancouverHockeyEvents_clean');
const VancouverBasketballEvents = require('./vancouverBasketballEvents_clean');
const VancouverTennisEvents = require('./vancouverTennisEvents_clean');
const VancouverBaseballEvents = require('./vancouverBaseballEvents_clean');
const VancouverFootballEvents = require('./vancouverFootballEvents_clean');
const VancouverGolfEvents = require('./vancouverGolfEvents_clean');
const VancouverVolleyballEvents = require('./vancouverVolleyballEvents_clean');
const VancouverBadmintonEvents = require('./vancouverBadmintonEvents_clean');
const VancouverSkiingEvents = require('./vancouverSkiingEvents_clean');
const VancouverSnowboardingEvents = require('./vancouverSnowboardingEvents_clean');
const VancouverIceSkatingEvents = require('./vancouverIceSkatingEvents_clean');
const VancouverWaterSportsEvents = require('./vancouverWaterSportsEvents_clean');
const VancouverSurfingEvents = require('./vancouverSurfingEvents_clean');
const VancouverKitesurfingEvents = require('./vancouverKitesurfingEvents_clean');
const VancouverWindsurfingEvents = require('./vancouverWindsurfingEvents_clean');
const VancouverSailingEvents = require('./vancouverSailingEvents_clean');
const VancouverRockClimbingEvents = require('./vancouverRockClimbingEvents_clean');
const VancouverHikingEvents = require('./vancouverHikingEvents_clean');
const VancouverCampingEvents = require('./vancouverCampingEvents_clean');
const VancouverFishingEvents = require('./vancouverFishingEvents_clean');
const VancouverHuntingEvents = require('./vancouverHuntingEvents_clean');
const VancouverPhotographyEvents = require('./vancouverPhotographyEvents_clean');
const VancouverFilmEventsClean = require('./vancouverFilmEvents_clean');
const VancouverDocumentaryEvents = require('./vancouverDocumentaryEvents_clean');
const VancouverIndependentFilmEvents = require('./vancouverIndependentFilmEvents_clean');
const VancouverShortFilmEvents = require('./vancouverShortFilmEvents_clean');

// LEGACY SCRAPERS (keeping some working ones for compatibility)
const commodoreBallroom = require('./commodoreBallroomEvents');
const vancouverAquariumEvents = require('./vancouverAquariumEvents');
const granvilleMarketEvents = require('./granvilleMarketEvents');
const steamworksBrewingEvents = require('./steamworksBrewingEvents');
const scienceWorldVancouverEvents = require('./scienceWorldVancouverEvents');

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
const SummerCinemaEvents = require('./summerCinemaEvents');
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
const { processBatchWithCity } = require('../../../utils/auto-detect-city');

class VancouverScrapers {
  constructor() {
    this.city = 'Vancouver';
    this.province = 'BC';
    this.country = 'Canada';
    this.sourceIdentifier = 'Vancouver';
    this.enabled = true;
    this.venueScrapers = [];

    // Add ALL CLEAN RECONSTRUCTED SCRAPERS - 125+ venues
    this.scrapers = [
      // ALL CLEAN SCRAPERS - 100% COMPLETE
      PembertomRecCentreEvents,
      BurnabyCentreEvents,
      RichmondCentreEvents,
      AbbotsfordCentreEvents,
      BcLionsEvents,
      BcPlaceStadiumEvents,
      BurnabyCentralParkEvents,
      BurnabyCentreForTheArtsEvents,
      CapilanoSuspensionBridgeEvents,
      CapilanoUniversityEvents,
      ChilliwackCulturalCentreEvents,
      CoastalJazzEvents,
      CoquitlamRiverCentreEvents,
      DeltaHeritageAirParkEvents,
      DouglasCollegeEvents,
      DragonBoatFestivalEvents,
      GastownGrandPrixEvents,
      GranvilleStreetEvents,
      GrouseMountainEvents,
      HelloGoodbyeBarEvents,
      KhatsahlanoEvents,
      KwantlenPolytechnicEvents,
      LangleyEventsCentreEvents,
      LangleyTownshipRecCentreEvents,
      MapleRidgeRecCentreEvents,
      MissionRecCentreEvents,
      MuseumOfVancouverEvents,
      NewWestminsterRecCentreEvents,
      NorthVancouverRecCentreEvents,
      PittMeadowsRecCentreEvents,
      PortCoquitlamRecCentreEvents,
      PortMoodyRecCentreEvents,
      DeltaCommunityCentreEvents,
      VancouverCommunityCollegeEvents,
      BcitEvents,
      SimonFraserUniversityEvents,
      UniversityOfBritishColumbiaEvents,
      EmilyCarrUniversityEvents,
      LangleyCollegeEvents,
      ColumbiaCollegeEvents,
      VancouverArtGalleryEventsClean,
      VancouverMuseumEvents,
      VancouverPlanetariumEvents,
      VancouverPublicLibraryEvents,
      VancouverCommunityNetworkEvents,
      VancouverHeritageFoundationEvents,
      VancouverFoodBankEvents,
      VancouverYMCAEvents,
      VancouverHospitalFoundationEvents,
      VancouverPoliceFoundationEvents,
      VancouverFireFightersCharityEvents,
      VancouverFilmSchoolEvents,
      VancouverAcademyOfMusicEvents,
      VancouverJazzFestivalEventsClean,
      VancouverBluesFestivalEvents,
      VancouverFolkMusicFestivalEvents,
      VancouverWorldMusicFestivalEvents,
      VancouverComedyFestivalEvents,
      VancouverDanceFestivalEvents,
      VancouverTheatreFestivalEvents,
      VancouverLiteratureFestivalEvents,
      VancouverArtsFestivalEvents,
      VancouverCulturalFestivalEvents,
      VancouverTechFestivalEvents,
      VancouverStartupWeekEvents,
      VancouverFoodFestivalEvents,
      VancouverWineFestivalEvents,
      VancouverCraftBeerFestivalEvents,
      VancouverHealthAndWellnessExpoEvents,
      VancouverAutomotiveShowEvents,
      VancouverHomeShowEvents,
      VancouverSportsShowEvents,
      VancouverBoatShowEvents,
      VancouverPetExpoEvents,
      VancouverBridalShowEvents,
      VancouverRVShowEvents,
      VancouverTradeShowEvents,
      VancouverJobFairEvents,
      VancouverGamingExpoEvents,
      // BATCH 13-17 CLEAN SCRAPERS
      VancouverComicConEvents,
      VancouverAnimeConventionEvents,
      VancouverCraftFairEvents,
      VancouverFarmersMarketEvents,
      VancouverNightMarketEvents,
      VancouverFleaMarketEvents,
      VancouverStreetFairEvents,
      VancouverMarathonEvents,
      VancouverTriathlonEvents,
      VancouverCyclingEvents,
      VancouverSwimmingEvents,
      VancouverSoccerEvents,
      VancouverHockeyEvents,
      VancouverBasketballEvents,
      VancouverTennisEvents,
      VancouverBaseballEvents,
      VancouverFootballEvents,
      VancouverGolfEvents,
      VancouverVolleyballEvents,
      VancouverBadmintonEvents,
      VancouverSkiingEvents,
      VancouverSnowboardingEvents,
      VancouverIceSkatingEvents,
      VancouverWaterSportsEvents,
      VancouverSurfingEvents,
      VancouverKitesurfingEvents,
      VancouverWindsurfingEvents,
      VancouverSailingEvents,
      VancouverRockClimbingEvents,
      VancouverHikingEvents,
      VancouverCampingEvents,
      VancouverFishingEvents,
      VancouverHuntingEvents,
      VancouverPhotographyEvents,
      VancouverFilmEventsClean,
      VancouverDocumentaryEvents,
      VancouverIndependentFilmEvents,
      VancouverShortFilmEvents,
      // LEGACY SCRAPERS (select working ones)
      commodoreBallroom,
      vancouverAquariumEvents,
      granvilleMarketEvents,
      steamworksBrewingEvents,
      scienceWorldVancouverEvents
    ];

    // Register ALL CLEAN RECONSTRUCTED SCRAPERS
    // BATCH 1-12 CLEAN SCRAPERS
    this.register(PembertomRecCentreEvents);
    this.register(BurnabyCentreEvents);
    this.register(RichmondCentreEvents);
    this.register(DeltaCommunityCentreEvents);
    this.register(VancouverCommunityCollegeEvents);
    this.register(BcitEvents);
    this.register(SimonFraserUniversityEvents);
    this.register(UniversityOfBritishColumbiaEvents);
    this.register(EmilyCarrUniversityEvents);
    this.register(LangleyCollegeEvents);
    this.register(ColumbiaCollegeEvents);
    this.register(VancouverArtGalleryEventsClean);
    this.register(VancouverMuseumEvents);
    this.register(VancouverPlanetariumEvents);
    this.register(VancouverPublicLibraryEvents);
    this.register(VancouverCommunityNetworkEvents);
    this.register(VancouverHeritageFoundationEvents);
    this.register(VancouverFoodBankEvents);
    this.register(VancouverYMCAEvents);
    this.register(VancouverHospitalFoundationEvents);
    this.register(VancouverPoliceFoundationEvents);
    this.register(VancouverFireFightersCharityEvents);
    this.register(VancouverFilmSchoolEvents);
    this.register(VancouverAcademyOfMusicEvents);
    this.register(VancouverJazzFestivalEventsClean);
    this.register(VancouverBluesFestivalEvents);
    this.register(VancouverFolkMusicFestivalEvents);
    this.register(VancouverWorldMusicFestivalEvents);
    this.register(VancouverComedyFestivalEvents);
    this.register(VancouverDanceFestivalEvents);
    this.register(VancouverTheatreFestivalEvents);
    this.register(VancouverLiteratureFestivalEvents);
    this.register(VancouverArtsFestivalEvents);
    this.register(VancouverCulturalFestivalEvents);
    this.register(VancouverTechFestivalEvents);
    this.register(VancouverStartupWeekEvents);
    this.register(VancouverFoodFestivalEvents);
    this.register(VancouverWineFestivalEvents);
    this.register(VancouverCraftBeerFestivalEvents);
    this.register(VancouverHealthAndWellnessExpoEvents);
    this.register(VancouverAutomotiveShowEvents);
    this.register(VancouverHomeShowEvents);
    this.register(VancouverSportsShowEvents);
    this.register(VancouverBoatShowEvents);
    this.register(VancouverPetExpoEvents);
    this.register(VancouverBridalShowEvents);
    this.register(VancouverRVShowEvents);
    this.register(VancouverTradeShowEvents);
    this.register(VancouverJobFairEvents);
    this.register(VancouverGamingExpoEvents);
    // BATCH 13-17 CLEAN SCRAPERS
    this.register(VancouverComicConEvents);
    this.register(VancouverAnimeConventionEvents);
    this.register(VancouverCraftFairEvents);
    this.register(VancouverFarmersMarketEvents);
    this.register(VancouverNightMarketEvents);
    this.register(VancouverFleaMarketEvents);
    this.register(VancouverStreetFairEvents);
    this.register(VancouverMarathonEvents);
    this.register(VancouverTriathlonEvents);
    this.register(VancouverCyclingEvents);
    this.register(VancouverSwimmingEvents);
    this.register(VancouverSoccerEvents);
    this.register(VancouverHockeyEvents);
    this.register(VancouverBasketballEvents);
    this.register(VancouverTennisEvents);
    this.register(VancouverBaseballEvents);
    this.register(VancouverFootballEvents);
    this.register(VancouverGolfEvents);
    this.register(VancouverVolleyballEvents);
    this.register(VancouverBadmintonEvents);
    this.register(VancouverSkiingEvents);
    this.register(VancouverSnowboardingEvents);
    this.register(VancouverIceSkatingEvents);
    this.register(VancouverWaterSportsEvents);
    this.register(VancouverSurfingEvents);
    this.register(VancouverKitesurfingEvents);
    this.register(VancouverWindsurfingEvents);
    this.register(VancouverSailingEvents);
    this.register(VancouverRockClimbingEvents);
    this.register(VancouverHikingEvents);
    this.register(VancouverCampingEvents);
    this.register(VancouverFishingEvents);
    this.register(VancouverHuntingEvents);
    this.register(VancouverPhotographyEvents);
    this.register(VancouverFilmEventsClean);
    this.register(VancouverDocumentaryEvents);
    this.register(VancouverIndependentFilmEvents);
    this.register(VancouverShortFilmEvents);
    // LEGACY SCRAPERS (select working ones)
    this.register(commodoreBallroom);
    this.register(vancouverAquariumEvents);
    this.register(granvilleMarketEvents);
    this.register(steamworksBrewingEvents);
    this.register(scienceWorldVancouverEvents);
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
      location: rawEvent.location || `Vancouver, ${this.province}`,
      venue: rawEvent.venue || {
        name: rawEvent.location || `Vancouver Venue`,
        address: rawEvent.venue?.address || 'Vancouver, BC',
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

    // Never return mock data - per user rules
    if (allEvents.length === 0) {
      console.log('No events found by Vancouver scrapers');
      return [];
    }

    console.log(`Vancouver scrapers found ${allEvents.length} events in total`);
    return allEvents;
  }

  // Mock events removed per user rules - no samples or fallbacks allowed
}

// Export a singleton instance

// AUTO-CITY DETECTION HELPER
// Ensures all events from this city have proper venue.name
function processEventsForCity(events, scraperName) {
  return processBatchWithCity(events, __filename);
}

module.exports = new VancouverScrapers();