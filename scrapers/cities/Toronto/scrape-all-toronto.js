const { MongoClient } = require('mongodb');
const { scrapeFriendsGuildParkEvents } = require('./scrape-friends-guild-park');
const { scrapeROMEvents } = require('./scrape-rom');
const { scrapeHorseshoeTavernEvents } = require('./scrape-horseshoe-tavern');
const { scrapeTBGEvents } = require('./scrape-toronto-botanical-garden');
const { scrapeMOCAEvents } = require('./scrape-moca');
const { scrapeGerrardIndiaBazaarEvents } = require('./scrape-gerrard-india-bazaar');
const { scrapeTorontoZooEvents } = require('./scrape-toronto-zoo');
const { scrapeRoncesvallesVillageEvents } = require('./scrape-roncesvalles-village');
const { scrapeNiagaraFallsEvents } = require('./scrape-niagara-falls');
const { scrapeMarkhamEvents } = require('./scrape-markham');
const { scrapeSquareOneEvents } = require('./scrape-square-one');
const { scrapeWetNWildEvents } = require('./scrape-wetnwild-toronto');

// Additional major Toronto venues
const { scrapeAGOEvents } = require('./scrape-ago-events');
const { scrapeHarbourfrontEvents } = require('./scrape-harbourfront-events');
const { scrapeCasaLomaEvents } = require('./scrape-casa-loma-events');
const { scrapeDistilleryDistrictEvents } = require('./scrape-distillery-district-events');
const { scrapeRBGEvents } = require('./scrape-rbg-events');
const { scrapeGardinerMuseumEvents } = require('./scrape-gardiner-museum-events');
const { scrapeRipleysAquariumEvents } = require('./scrape-ripleysaquarium-events');
const { scrapeHighParkEvents } = require('./scrape-highpark-events');
const { scrapeEvergreenBrickWorksEvents } = require('./scrape-evergreen-brick-works-events');
const { scrapeTorontoLibraryEvents } = require('./scrape-toronto-library-events');

// New scrapers
const scrapeRiverwoodConservancyEvents = require('./scrape-riverwood-conservancy');
const scrapeUnionvilleEvents = require('./scrape-unionville-events');

// Major Toronto Festival Scrapers
const { scrapeEvents: scrapeTIFFEvents } = require('./scrape-toronto-international-film-festival');
const { scrapeEvents: scrapeCaribanaEvents } = require('./scrape-caribana-festival');
const { scrapeEvents: scrapeTorontoPrideEvents } = require('./scrape-toronto-pride');

// Toronto Nightlife Venues
const { scrapeFutureNightlifeEvents } = require('./scrape-future-nightlife-events');
const { scrapeNestTorontoEvents } = require('./scrape-nest-toronto-events');
const { scrapeOasisAqualoungeEvents } = require('./scrape-oasis-aqualounge-events');
const { scrapeRebelNightclubEvents } = require('./scrape-rebel-nightclub-events');
const { scrapeToyboxTorontoEvents } = require('./scrape-toybox-toronto-events');
const { scrape44TorontoEvents } = require('./scrape-44toronto-events');
const { scrapeCenturyEvents } = require('./scrape-century-events');
const { scrapeDprtmntEvents } = require('./scrape-dprtmnt-events');
const { scrapeFictionClubEvents } = require('./scrape-fiction-club-events');
const { scrapeLost577Events } = require('./scrape-lost577-events');
const { scrapeMiaTorontoEvents } = require('./scrape-mia-toronto-events');
const { scrapeVelvetEvents } = require('./scrape-velvet-events');
const { scrapeVertigoEvents } = require('./scrape-vertigo-events');
const { scrapeRevivalEventVenueEvents } = require('./scrape-revival-event-venue-events');
const { scrapeLulaLoungeEvents } = require('./scrape-lula-lounge-events');
const { scrapeClub54Events } = require('./scrape-club54-events');
const { scrapeXClubEvents } = require('./scrape-xclub-events');
const { scrapeDirtyMartiniEvents } = require('./scrape-dirty-martini-events');
const { scrape6ixLoungeEvents } = require('./scrape-6ix-lounge-events');
const { scrapeSeventySevenEvents } = require('./scrape-seventy-seven-events');

// NEW GTA VENUE SCRAPERS - Major venues across the Greater Toronto Area
const DanforthMusicHallScraper = require('./scrape-danforth-music-hall');
const PhoenixConcertTheatreScraper = require('./scrape-phoenix-concert-theatre');
const OperaHouseScraper = require('./scrape-opera-house');
const LivingArtsCentreScraper = require('./scrape-living-arts-centre');
const RoseTheatreScraper = require('./scrape-rose-theatre');
const MarkhamTheatreScraper = require('./scrape-markham-theatre');
const BurlingtonPerformingArtsScraper = require('./scrape-burlington-performing-arts');
const OakvilleCentreScraper = require('./scrape-oakville-centre');
const RichmondHillCentreScraper = require('./scrape-richmond-hill-centre');
const VaughanMillsEventsScraper = require('./scrape-vaughan-mills-events');
const RegentTheatreOshawaScraper = require('./scrape-regent-theatre-oshawa');
const PickeringCasinoEventsScraper = require('./scrape-pickering-casino-events');
const UniversityOfTorontoEventsScraper = require('./scrape-university-of-toronto-events');
const YorkUniversityEventsScraper = require('./scrape-york-university-events');
const AjaxCommunityEventsScraper = require('./scrape-ajax-community-events');

/**
 * Run all Toronto event scrapers
 */
async function scrapeAllTorontoEvents() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/discovr';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('discovr');
    const eventsCollection = db.collection('events');
    
    console.log('🚀 Starting comprehensive Toronto event scraping...');
    console.log('=' .repeat(60));
    
    let totalAdded = 0;
    
    // 1. Gerrard India Bazaar
    console.log('\n📍 1. Scraping Gerrard India Bazaar...');
    try {
      const added1 = await scrapeGerrardIndiaBazaarEvents(eventsCollection);
      totalAdded += added1;
      console.log(`✅ Gerrard India Bazaar: ${added1} events`);
    } catch (error) {
      console.error(`❌ Gerrard India Bazaar failed: ${error.message}`);
    }
    
    // 2. Friends of Guild Park
    console.log('\n📍 2. Scraping Friends of Guild Park...');
    try {
      const added2 = await scrapeFriendsGuildParkEvents(eventsCollection);
      totalAdded += added2;
      console.log(`✅ Friends of Guild Park: ${added2} events`);
    } catch (error) {
      console.error(`❌ Friends of Guild Park failed: ${error.message}`);
    }
    
    // 3. Royal Ontario Museum
    console.log('\n📍 3. Scraping Royal Ontario Museum...');
    try {
      const added3 = await scrapeROMEvents(eventsCollection);
      totalAdded += added3;
      console.log(`✅ Royal Ontario Museum: ${added3} events`);
    } catch (error) {
      console.error(`❌ Royal Ontario Museum failed: ${error.message}`);
    }
    
    // 4. Horseshoe Tavern
    console.log('\n📍 4. Scraping Horseshoe Tavern...');
    try {
      const added4 = await scrapeHorseshoeTavernEvents(eventsCollection);
      totalAdded += added4;
      console.log(`✅ Horseshoe Tavern: ${added4} events`);
    } catch (error) {
      console.error(`❌ Horseshoe Tavern failed: ${error.message}`);
    }
    
    // 5. Toronto Botanical Garden
    console.log('\n📍 5. Scraping Toronto Botanical Garden...');
    try {
      const added5 = await scrapeTBGEvents(eventsCollection);
      totalAdded += added5;
      console.log(`✅ Toronto Botanical Garden: ${added5} events`);
    } catch (error) {
      console.error(`❌ Toronto Botanical Garden failed: ${error.message}`);
    }
    
    // 6. MOCA Toronto
    console.log('\n📍 6. Scraping MOCA Toronto...');
    try {
      const added6 = await scrapeMOCAEvents(eventsCollection);
      totalAdded += added6;
      console.log(`✅ MOCA Toronto: ${added6} events`);
    } catch (error) {
      console.error(`❌ MOCA Toronto failed: ${error.message}`);
    }
    
    // 7. Toronto Zoo
    console.log('\n📍 7. Scraping Toronto Zoo...');
    try {
      const added7 = await scrapeTorontoZooEvents(eventsCollection);
      totalAdded += added7;
      console.log(`✅ Toronto Zoo: ${added7} events`);
    } catch (error) {
      console.error(`❌ Toronto Zoo failed: ${error.message}`);
    }
    
    // 8. Roncesvalles Village
    console.log('\n📍 8. Scraping Roncesvalles Village...');
    try {
      const added8 = await scrapeRoncesvallesVillageEvents(eventsCollection);
      totalAdded += added8;
      console.log(`✅ Roncesvalles Village: ${added8} events`);
    } catch (error) {
      console.error(`❌ Roncesvalles Village failed: ${error.message}`);
    }
    
    // 9. Niagara Falls
    console.log('\n📍 9. Scraping Niagara Falls...');
    try {
      const added9 = await scrapeNiagaraFallsEvents(eventsCollection);
      totalAdded += added9;
      console.log(`✅ Niagara Falls: ${added9} events`);
    } catch (error) {
      console.error(`❌ Niagara Falls failed: ${error.message}`);
    }
    
    // 10. City of Markham
    console.log('\n📍 10. Scraping City of Markham...');
    try {
      const added10 = await scrapeMarkhamEvents(eventsCollection);
      totalAdded += added10;
      console.log(`✅ City of Markham: ${added10} events`);
    } catch (error) {
      console.error(`❌ City of Markham failed: ${error.message}`);
    }
    
    // 11. Square One Shopping Centre
    console.log('\n📍 11. Scraping Square One Shopping Centre...');
    try {
      const added11 = await scrapeSquareOneEvents(eventsCollection);
      totalAdded += added11;
      console.log(`✅ Square One Shopping Centre: ${added11} events`);
    } catch (error) {
      console.error(`❌ Square One Shopping Centre failed: ${error.message}`);
    }
    
    // 12. Wet'n'Wild Toronto
    console.log('\n📍 12. Scraping Wet\'n\'Wild Toronto...');
    try {
      const added12 = await scrapeWetNWildEvents(eventsCollection);
      totalAdded += added12;
      console.log(`✅ Wet\'n\'Wild Toronto: ${added12} events`);
    } catch (error) {
      console.error(`❌ Wet\'n\'Wild Toronto failed: ${error.message}`);
    }
    
    // 13. Art Gallery of Ontario (AGO)
    console.log('\n📍 13. Scraping Art Gallery of Ontario...');
    try {
      const added13 = await scrapeAGOEvents(eventsCollection);
      totalAdded += added13;
      console.log(`✅ Art Gallery of Ontario: ${added13} events`);
    } catch (error) {
      console.error(`❌ Art Gallery of Ontario failed: ${error.message}`);
    }
    
    // 14. Harbourfront Centre
    console.log('\n📍 14. Scraping Harbourfront Centre...');
    try {
      const added14 = await scrapeHarbourfrontEvents(eventsCollection);
      totalAdded += added14;
      console.log(`✅ Harbourfront Centre: ${added14} events`);
    } catch (error) {
      console.error(`❌ Harbourfront Centre failed: ${error.message}`);
    }
    
    // 15. Casa Loma
    console.log('\n📍 15. Scraping Casa Loma...');
    try {
      const added15 = await scrapeCasaLomaEvents(eventsCollection);
      totalAdded += added15;
      console.log(`✅ Casa Loma: ${added15} events`);
    } catch (error) {
      console.error(`❌ Casa Loma failed: ${error.message}`);
    }
    
    // 16. Distillery District
    console.log('\n📍 16. Scraping Distillery District...');
    try {
      const added16 = await scrapeDistilleryDistrictEvents(eventsCollection);
      totalAdded += added16;
      console.log(`✅ Distillery District: ${added16} events`);
    } catch (error) {
      console.error(`❌ Distillery District failed: ${error.message}`);
    }
    
    // 17. Royal Botanical Gardens
    console.log('\n📍 17. Scraping Royal Botanical Gardens...');
    try {
      const added17 = await scrapeRBGEvents(eventsCollection);
      totalAdded += added17;
      console.log(`✅ Royal Botanical Gardens: ${added17} events`);
    } catch (error) {
      console.error(`❌ Royal Botanical Gardens failed: ${error.message}`);
    }
    
    // 18. Gardiner Museum
    console.log('\n📍 18. Scraping Gardiner Museum...');
    try {
      const added18 = await scrapeGardinerMuseumEvents(eventsCollection);
      totalAdded += added18;
      console.log(`✅ Gardiner Museum: ${added18} events`);
    } catch (error) {
      console.error(`❌ Gardiner Museum failed: ${error.message}`);
    }
    
    // 19. Ripley's Aquarium
    console.log('\n📍 19. Scraping Ripley\'s Aquarium...');
    try {
      const added19 = await scrapeRipleysAquariumEvents(eventsCollection);
      totalAdded += added19;
      console.log(`✅ Ripley\'s Aquarium: ${added19} events`);
    } catch (error) {
      console.error(`❌ Ripley\'s Aquarium failed: ${error.message}`);
    }
    
    // 20. High Park
    console.log('\n📍 20. Scraping High Park...');
    try {
      const added20 = await scrapeHighParkEvents(eventsCollection);
      totalAdded += added20;
      console.log(`✅ High Park: ${added20} events`);
    } catch (error) {
      console.error(`❌ High Park failed: ${error.message}`);
    }
    
    // 21. Evergreen Brick Works
    console.log('\n📍 21. Scraping Evergreen Brick Works...');
    try {
      const added21 = await scrapeEvergreenBrickWorksEvents(eventsCollection);
      totalAdded += added21;
      console.log(`✅ Evergreen Brick Works: ${added21} events`);
    } catch (error) {
      console.error(`❌ Evergreen Brick Works failed: ${error.message}`);
    }
    
    // 22. Toronto Public Library
    console.log('\n📍 22. Scraping Toronto Public Library...');
    try {
      const added22 = await scrapeTorontoLibraryEvents(eventsCollection);
      totalAdded += added22;
      console.log(`✅ Toronto Public Library: ${added22} events`);
    } catch (error) {
      console.error(`❌ Toronto Public Library failed: ${error.message}`);
    }
    
    // 23. Riverwood Conservancy
    console.log('\n📍 23. Scraping Riverwood Conservancy...');
    try {
      const added23 = await scrapeRiverwoodConservancyEvents(eventsCollection);
      totalAdded += added23;
      console.log(`✅ Riverwood Conservancy: ${added23} events`);
    } catch (error) {
      console.error(`❌ Riverwood Conservancy failed: ${error.message}`);
    }
    
    // 24. Main Street Unionville
    console.log('\n📍 24. Scraping Main Street Unionville...');
    try {
      const added24 = await scrapeUnionvilleEvents(eventsCollection);
      totalAdded += added24;
      console.log(`✅ Main Street Unionville: ${added24} events`);
    } catch (error) {
      console.error(`❌ Main Street Unionville failed: ${error.message}`);
    }
    
    // 25. Future Nightlife
    console.log('\n📍 25. Scraping Future Nightlife...');
    try {
      const added25 = await scrapeFutureNightlifeEvents(eventsCollection);
      totalAdded += added25;
      console.log(`✅ Future Nightlife: ${added25} events`);
    } catch (error) {
      console.error(`❌ Future Nightlife failed: ${error.message}`);
    }
    
    // 26. Nest Toronto
    console.log('\n📍 26. Scraping Nest Toronto...');
    try {
      const added26 = await scrapeNestTorontoEvents(eventsCollection);
      totalAdded += added26;
      console.log(`✅ Nest Toronto: ${added26} events`);
    } catch (error) {
      console.error(`❌ Nest Toronto failed: ${error.message}`);
    }
    
    // 27. Oasis Aqualounge
    console.log('\n📍 27. Scraping Oasis Aqualounge...');
    try {
      const added27 = await scrapeOasisAqualoungeEvents(eventsCollection);
      totalAdded += added27;
      console.log(`✅ Oasis Aqualounge: ${added27} events`);
    } catch (error) {
      console.error(`❌ Oasis Aqualounge failed: ${error.message}`);
    }
    
    // 28. Rebel Nightclub
    console.log('\n📍 28. Scraping Rebel Nightclub...');
    try {
      const added28 = await scrapeRebelNightclubEvents(eventsCollection);
      totalAdded += added28;
      console.log(`✅ Rebel Nightclub: ${added28} events`);
    } catch (error) {
      console.error(`❌ Rebel Nightclub failed: ${error.message}`);
    }
    
    // 29. Toybox Toronto
    console.log('\n📍 29. Scraping Toybox Toronto...');
    try {
      const added29 = await scrapeToyboxTorontoEvents(eventsCollection);
      totalAdded += added29;
      console.log(`✅ Toybox Toronto: ${added29} events`);
    } catch (error) {
      console.error(`❌ Toybox Toronto failed: ${error.message}`);
    }
    
    // 30. 44 Toronto
    console.log('\n📍 30. Scraping 44 Toronto...');
    try {
      const added30 = await scrape44TorontoEvents(eventsCollection);
      totalAdded += added30;
      console.log(`✅ 44 Toronto: ${added30} events`);
    } catch (error) {
      console.error(`❌ 44 Toronto failed: ${error.message}`);
    }
    
    // 31. Century
    console.log('\n📍 31. Scraping Century...');
    try {
      const added31 = await scrapeCenturyEvents(eventsCollection);
      totalAdded += added31;
      console.log(`✅ Century: ${added31} events`);
    } catch (error) {
      console.error(`❌ Century failed: ${error.message}`);
    }
    
    // 32. DPRTMNT
    console.log('\n📍 32. Scraping DPRTMNT...');
    try {
      const added32 = await scrapeDprtmntEvents(eventsCollection);
      totalAdded += added32;
      console.log(`✅ DPRTMNT: ${added32} events`);
    } catch (error) {
      console.error(`❌ DPRTMNT failed: ${error.message}`);
    }
    
    // 33. Fiction Club
    console.log('\n📍 33. Scraping Fiction Club...');
    try {
      const added33 = await scrapeFictionClubEvents(eventsCollection);
      totalAdded += added33;
      console.log(`✅ Fiction Club: ${added33} events`);
    } catch (error) {
      console.error(`❌ Fiction Club failed: ${error.message}`);
    }
    
    // 34. Lost 577
    console.log('\n📍 34. Scraping Lost 577...');
    try {
      const added34 = await scrapeLost577Events(eventsCollection);
      totalAdded += added34;
      console.log(`✅ Lost 577: ${added34} events`);
    } catch (error) {
      console.error(`❌ Lost 577 failed: ${error.message}`);
    }
    
    // 35. MIA Toronto
    console.log('\n📍 35. Scraping MIA Toronto...');
    try {
      const added35 = await scrapeMiaTorontoEvents(eventsCollection);
      totalAdded += added35;
      console.log(`✅ MIA Toronto: ${added35} events`);
    } catch (error) {
      console.error(`❌ MIA Toronto failed: ${error.message}`);
    }
    
    // 36. The Velvet
    console.log('\n📍 36. Scraping The Velvet...');
    try {
      const added36 = await scrapeVelvetEvents(eventsCollection);
      totalAdded += added36;
      console.log(`✅ The Velvet: ${added36} events`);
    } catch (error) {
      console.error(`❌ The Velvet failed: ${error.message}`);
    }
    
    // 37. Vertigo
    console.log('\n📍 37. Scraping Vertigo...');
    try {
      const added37 = await scrapeVertigoEvents(eventsCollection);
      totalAdded += added37;
      console.log(`✅ Vertigo: ${added37} events`);
    } catch (error) {
      console.error(`❌ Vertigo failed: ${error.message}`);
    }
    
    // 38. Revival Event Venue
    console.log('\n📍 38. Scraping Revival Event Venue...');
    try {
      const added38 = await scrapeRevivalEventVenueEvents(eventsCollection);
      totalAdded += added38;
      console.log(`✅ Revival Event Venue: ${added38} events`);
    } catch (error) {
      console.error(`❌ Revival Event Venue failed: ${error.message}`);
    }
    
    // 39. Lula Lounge
    console.log('\n📍 39. Scraping Lula Lounge...');
    try {
      const added39 = await scrapeLulaLoungeEvents(eventsCollection);
      totalAdded += added39;
      console.log(`✅ Lula Lounge: ${added39} events`);
    } catch (error) {
      console.error(`❌ Lula Lounge failed: ${error.message}`);
    }
    
    // 40. Club 54
    console.log('\n📍 40. Scraping Club 54...');
    try {
      const added40 = await scrapeClub54Events(eventsCollection);
      totalAdded += added40;
      console.log(`✅ Club 54: ${added40} events`);
    } catch (error) {
      console.error(`❌ Club 54 failed: ${error.message}`);
    }
    
    // 41. The X Club
    console.log('\n📍 41. Scraping The X Club...');
    try {
      const added41 = await scrapeXClubEvents(eventsCollection);
      totalAdded += added41;
      console.log(`✅ The X Club: ${added41} events`);
    } catch (error) {
      console.error(`❌ The X Club failed: ${error.message}`);
    }
    
    // 42. Dirty Martini
    console.log('\n📍 42. Scraping Dirty Martini...');
    try {
      const added42 = await scrapeDirtyMartiniEvents(eventsCollection);
      totalAdded += added42;
      console.log(`✅ Dirty Martini: ${added42} events`);
    } catch (error) {
      console.error(`❌ Dirty Martini failed: ${error.message}`);
    }
    
    // 43. The 6ix Lounge
    console.log('\n📍 43. Scraping The 6ix Lounge...');
    try {
      const added43 = await scrape6ixLoungeEvents(eventsCollection);
      totalAdded += added43;
      console.log(`✅ The 6ix Lounge: ${added43} events`);
    } catch (error) {
      console.error(`❌ The 6ix Lounge failed: ${error.message}`);
    }
    
    // 44. Seventy Seven
    console.log('\n📍 44. Scraping Seventy Seven...');
    try {
      const added44 = await scrapeSeventySevenEvents(eventsCollection);
      totalAdded += added44;
      console.log(`✅ Seventy Seven: ${added44} events`);
    } catch (error) {
      console.error(`❌ Seventy Seven failed: ${error.message}`);
    }
    
    console.log('\n🎭 === MAJOR TORONTO FESTIVALS ===');
    
    // 45. Toronto International Film Festival (TIFF)
    console.log('\n📍 45. Scraping Toronto International Film Festival (TIFF)...');
    try {
      const tiffEvents = await scrapeTIFFEvents();
      let added45 = 0;
      for (const event of tiffEvents) {
        const existing = await eventsCollection.findOne({ sourceId: event.sourceId });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added45++;
        }
      }
      totalAdded += added45;
      console.log(`✅ TIFF: ${added45} events`);
    } catch (error) {
      console.error(`❌ TIFF failed: ${error.message}`);
    }
    
    // 46. Toronto Caribbean Carnival (Caribana)
    console.log('\n📍 46. Scraping Toronto Caribbean Carnival (Caribana)...');
    try {
      const caribanaEvents = await scrapeCaribanaEvents();
      let added46 = 0;
      for (const event of caribanaEvents) {
        const existing = await eventsCollection.findOne({ sourceId: event.sourceId });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added46++;
        }
      }
      totalAdded += added46;
      console.log(`✅ Caribana: ${added46} events`);
    } catch (error) {
      console.error(`❌ Caribana failed: ${error.message}`);
    }
    
    // 47. Toronto Pride Festival
    console.log('\n📍 47. Scraping Toronto Pride Festival...');
    try {
      const prideEvents = await scrapeTorontoPrideEvents();
      let added47 = 0;
      for (const event of prideEvents) {
        const existing = await eventsCollection.findOne({ sourceId: event.sourceId });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added47++;
        }
      }
      totalAdded += added47;
      console.log(`✅ Toronto Pride: ${added47} events`);
    } catch (error) {
      console.error(`❌ Toronto Pride failed: ${error.message}`);
    }
    
    // NEW GTA VENUE SCRAPERS - Major venues across the Greater Toronto Area
    
    // 48. Danforth Music Hall
    console.log('\n📍 48. Scraping Danforth Music Hall...');
    try {
      const danforthScraper = new DanforthMusicHallScraper();
      const danforthEvents = await danforthScraper.scrape();
      let added48 = 0;
      for (const event of danforthEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added48++;
        }
      }
      totalAdded += added48;
      console.log(`✅ Danforth Music Hall: ${added48} events`);
    } catch (error) {
      console.error(`❌ Danforth Music Hall failed: ${error.message}`);
    }
    
    // 49. Phoenix Concert Theatre
    console.log('\n📍 49. Scraping Phoenix Concert Theatre...');
    try {
      const phoenixScraper = new PhoenixConcertTheatreScraper();
      const phoenixEvents = await phoenixScraper.scrape();
      let added49 = 0;
      for (const event of phoenixEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added49++;
        }
      }
      totalAdded += added49;
      console.log(`✅ Phoenix Concert Theatre: ${added49} events`);
    } catch (error) {
      console.error(`❌ Phoenix Concert Theatre failed: ${error.message}`);
    }
    
    // 50. The Opera House
    console.log('\n📍 50. Scraping The Opera House...');
    try {
      const operaScraper = new OperaHouseScraper();
      const operaEvents = await operaScraper.scrape();
      let added50 = 0;
      for (const event of operaEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added50++;
        }
      }
      totalAdded += added50;
      console.log(`✅ The Opera House: ${added50} events`);
    } catch (error) {
      console.error(`❌ The Opera House failed: ${error.message}`);
    }
    
    // 51. Living Arts Centre (Mississauga)
    console.log('\n📍 51. Scraping Living Arts Centre (Mississauga)...');
    try {
      const livingArtsScraper = new LivingArtsCentreScraper();
      const livingArtsEvents = await livingArtsScraper.scrape();
      let added51 = 0;
      for (const event of livingArtsEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added51++;
        }
      }
      totalAdded += added51;
      console.log(`✅ Living Arts Centre: ${added51} events`);
    } catch (error) {
      console.error(`❌ Living Arts Centre failed: ${error.message}`);
    }
    
    // 52. Rose Theatre (Brampton)
    console.log('\n📍 52. Scraping Rose Theatre (Brampton)...');
    try {
      const roseScraper = new RoseTheatreScraper();
      const roseEvents = await roseScraper.scrape();
      let added52 = 0;
      for (const event of roseEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added52++;
        }
      }
      totalAdded += added52;
      console.log(`✅ Rose Theatre: ${added52} events`);
    } catch (error) {
      console.error(`❌ Rose Theatre failed: ${error.message}`);
    }
    
    // 53. University of Toronto Events
    console.log('\n📍 53. Scraping University of Toronto Events...');
    try {
      const uoftScraper = new UniversityOfTorontoEventsScraper();
      const uoftEvents = await uoftScraper.scrape();
      let added53 = 0;
      for (const event of uoftEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added53++;
        }
      }
      totalAdded += added53;
      console.log(`✅ University of Toronto: ${added53} events`);
    } catch (error) {
      console.error(`❌ University of Toronto failed: ${error.message}`);
    }
    
    // 54. York University Events
    console.log('\n📍 54. Scraping York University Events...');
    try {
      const yorkScraper = new YorkUniversityEventsScraper();
      const yorkEvents = await yorkScraper.scrape();
      let added54 = 0;
      for (const event of yorkEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added54++;
        }
      }
      totalAdded += added54;
      console.log(`✅ York University: ${added54} events`);
    } catch (error) {
      console.error(`❌ York University failed: ${error.message}`);
    }
    
    // 55. Markham Theatre
    console.log('\n📍 55. Scraping Markham Theatre...');
    try {
      const markhamScraper = new MarkhamTheatreScraper();
      const markhamEvents = await markhamScraper.scrape();
      let added55 = 0;
      for (const event of markhamEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added55++;
        }
      }
      totalAdded += added55;
      console.log(`✅ Markham Theatre: ${added55} events`);
    } catch (error) {
      console.error(`❌ Markham Theatre failed: ${error.message}`);
    }
    
    // 56. Burlington Performing Arts Centre
    console.log('\n📍 56. Scraping Burlington Performing Arts Centre...');
    try {
      const burlingtonScraper = new BurlingtonPerformingArtsScraper();
      const burlingtonEvents = await burlingtonScraper.scrape();
      let added56 = 0;
      for (const event of burlingtonEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added56++;
        }
      }
      totalAdded += added56;
      console.log(`✅ Burlington PAC: ${added56} events`);
    } catch (error) {
      console.error(`❌ Burlington PAC failed: ${error.message}`);
    }
    
    // 57. Oakville Centre for the Performing Arts
    console.log('\n📍 57. Scraping Oakville Centre...');
    try {
      const oakvilleScraper = new OakvilleCentreScraper();
      const oakvilleEvents = await oakvilleScraper.scrape();
      let added57 = 0;
      for (const event of oakvilleEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added57++;
        }
      }
      totalAdded += added57;
      console.log(`✅ Oakville Centre: ${added57} events`);
    } catch (error) {
      console.error(`❌ Oakville Centre failed: ${error.message}`);
    }
    
    // 58. Richmond Hill Centre
    console.log('\n📍 58. Scraping Richmond Hill Centre...');
    try {
      const richmondScraper = new RichmondHillCentreScraper();
      const richmondEvents = await richmondScraper.scrape();
      let added58 = 0;
      for (const event of richmondEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added58++;
        }
      }
      totalAdded += added58;
      console.log(`✅ Richmond Hill Centre: ${added58} events`);
    } catch (error) {
      console.error(`❌ Richmond Hill Centre failed: ${error.message}`);
    }
    
    // 59. Vaughan Mills Events
    console.log('\n📍 59. Scraping Vaughan Mills Events...');
    try {
      const vaughanScraper = new VaughanMillsEventsScraper();
      const vaughanEvents = await vaughanScraper.scrape();
      let added59 = 0;
      for (const event of vaughanEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added59++;
        }
      }
      totalAdded += added59;
      console.log(`✅ Vaughan Mills: ${added59} events`);
    } catch (error) {
      console.error(`❌ Vaughan Mills failed: ${error.message}`);
    }
    
    // 60. Regent Theatre Oshawa
    console.log('\n📍 60. Scraping Regent Theatre Oshawa...');
    try {
      const regentScraper = new RegentTheatreOshawaScraper();
      const regentEvents = await regentScraper.scrape();
      let added60 = 0;
      for (const event of regentEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added60++;
        }
      }
      totalAdded += added60;
      console.log(`✅ Regent Theatre Oshawa: ${added60} events`);
    } catch (error) {
      console.error(`❌ Regent Theatre Oshawa failed: ${error.message}`);
    }
    
    // 61. Pickering Casino Events
    console.log('\n📍 61. Scraping Pickering Casino Events...');
    try {
      const pickeringScraper = new PickeringCasinoEventsScraper();
      const pickeringEvents = await pickeringScraper.scrape();
      let added61 = 0;
      for (const event of pickeringEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added61++;
        }
      }
      totalAdded += added61;
      console.log(`✅ Pickering Casino: ${added61} events`);
    } catch (error) {
      console.error(`❌ Pickering Casino failed: ${error.message}`);
    }
    
    // 62. Ajax Community Events
    console.log('\n📍 62. Scraping Ajax Community Events...');
    try {
      const ajaxScraper = new AjaxCommunityEventsScraper();
      const ajaxEvents = await ajaxScraper.scrape();
      let added62 = 0;
      for (const event of ajaxEvents) {
        const existing = await eventsCollection.findOne({ title: event.title, startDate: event.startDate, 'venue.name': event.venue.name });
        if (!existing) {
          await eventsCollection.insertOne(event);
          added62++;
        }
      }
      totalAdded += added62;
      console.log(`✅ Ajax Community: ${added62} events`);
    } catch (error) {
      console.error(`❌ Ajax Community failed: ${error.message}`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📈 SCRAPING SUMMARY');
    console.log('=' .repeat(60));
    console.log(`🎯 Total events added: ${totalAdded}`);
    console.log('📍 Sources scraped:');
    console.log('   • Gerrard India Bazaar');
    console.log('   • Friends of Guild Park');
    console.log('   • Royal Ontario Museum');
    console.log('   • Horseshoe Tavern');
    console.log('   • Toronto Botanical Garden');
    console.log('   • MOCA Toronto');
    console.log('   • Toronto Zoo');
    console.log('   • Roncesvalles Village');
    console.log('   • Niagara Falls');
    console.log('   • City of Markham');
    console.log('   • Square One Shopping Centre');
    console.log('   • Wet\'n\'Wild Toronto');
    console.log('   • Art Gallery of Ontario (AGO)');
    console.log('   • Harbourfront Centre');
    console.log('   • Casa Loma');
    console.log('   • Distillery District');
    console.log('   • Royal Botanical Gardens');
    console.log('   • Gardiner Museum');
    console.log('   • Ripley\'s Aquarium');
    console.log('   • High Park');
    console.log('   • Evergreen Brick Works');
    console.log('   • Toronto Public Library');
    console.log('   • Riverwood Conservancy');
    console.log('   • Main Street Unionville');
    console.log('   • Future Nightlife');
    console.log('   • Nest Toronto');
    console.log('   • Oasis Aqualounge');
    console.log('   • Rebel Nightclub');
    console.log('   • Toybox Toronto');
    console.log('   • 44 Toronto');
    console.log('   • Century');
    console.log('   • DPRTMNT');
    console.log('   • Fiction Club');
    console.log('   • Lost 577');
    console.log('   • MIA Toronto');
    console.log('   • The Velvet');
    console.log('   • Vertigo');
    console.log('   • Revival Event Venue');
    console.log('   • Lula Lounge');
    console.log('   • Club 54');
    console.log('   • The X Club');
    console.log('   • Dirty Martini');
    console.log('   • The 6ix Lounge');
    console.log('   • Seventy Seven');
    
    // Get current total count
    const totalEvents = await eventsCollection.countDocuments({});
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // Get Toronto-specific count
    const torontoEvents = await eventsCollection.countDocuments({
      $or: [
        { source: 'Gerrard India Bazaar' },
        { source: 'Friends of Guild Park' },
        { source: 'Royal Ontario Museum' },
        { source: 'Horseshoe Tavern' },
        { source: 'Toronto Botanical Garden' },
        { source: 'MOCA Toronto' },
        { source: 'Toronto Zoo' },
        { source: 'Roncesvalles Village' },
        { source: 'City of Niagara Falls' },
        { 'venue.city': 'Toronto' },
        { 'venue.city': 'Niagara Falls' }
      ]
    });
    console.log(`🏙️ Total Toronto events: ${torontoEvents}`);
    
    console.log('\n🎉 Toronto event scraping completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in master scraper:', error.message);
  } finally {
    console.log('🔌 MongoDB connection closed');
    await client.close();
  }
}

/**
 * Main function
 */
async function main() {
  await scrapeAllTorontoEvents();
}

// Run the master scraper
if (require.main === module) {
  main();
}

module.exports = { scrapeAllTorontoEvents };
