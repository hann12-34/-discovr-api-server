/**
 * Toronto city scraper coordinator
 * Manages all Toronto venue scrapers
 */

const MasseyHallEvents = require('./massey-hall');
const MeridianHallEvents = require('./meridian-hall');
const RoyThomsonHallEvents = require('./roy-thomson-hall');
const TorontoEventsOfficial = require('./toronto-events');

// Major event source scrapers
const TorontoCaEvents = require('./scrape-toronto-ca-events');
const NowPlayingTorontoEvents = require('./scrape-nowplaying-toronto-events');
const TodoCanadaTorontoEvents = require('./scrape-todocanada-toronto-events');

// 🎭 NIGHTLIFE VENUES (High Volume)
const RebelNightclub = require('./scrape-rebel-nightclub-events');
const FictionClub = require('./scrape-fiction-club-events');
const VelvetEvents = require('./scrape-velvet-events');
const SixLounge = require('./scrape-6ix-lounge-events');
const Club54Events = require('./scrape-club54-events');
const FutureNightlife = require('./scrape-future-nightlife-events');
const DirtyMartini = require('./scrape-dirty-martini-events');
const XClubEvents = require('./scrape-xclub-events');
const VertigoEvents = require('./scrape-vertigo-events');
const UVTorontoEvents = require('./scrape-uv-toronto-events');

// 🏛️ MAJOR MUSEUMS & ATTRACTIONS (High Volume)
const ROMEvents = require('./scrape-rom-events');
const AGOEvents = require('./scrape-ago-events');
const OntarioScienceCentre = require('./scrape-ontario-science-centre-events');
const CasaLomaEvents = require('./scrape-casa-loma-events');
const RipleysAquarium = require('./scrape-ripleysaquarium-events');
const CNTowerEvents = require('./scrape-cn-tower');
const GardinerMuseum = require('./scrape-gardiner-museum-events');
const TextileMuseum = require('./scrape-textile-museum-events');
const MOCAEvents = require('./scrape-moca-events');
const AgaKhanMuseum = require('./scrape-aga-khan-museum-events');

// 🎪 FESTIVALS & CULTURAL EVENTS (High Volume)
const TIFFEvents = require('./scrape-tiff-bell-lightbox-events');
const TorontoInternationalFilmFestival = require('./scrape-toronto-international-film-festival');
const TorontoPride = require('./scrape-toronto-pride');
const CaribaneFestival = require('./scrape-caribana-festival');
const HotDocsEvents = require('./scrape-hot-docs-events');

// 🏞️ OUTDOOR & PARKS (High Volume)
const TorontoZooEvents = require('./scrape-toronto-zoo-events');
const HighParkEvents = require('./scrape-highpark-events');
const TorontoIslands = require('./scrape-toronto-islands');
const EvergreenBrickWorks = require('./scrape-evergreen-brick-works-events');
const WaterfrontToronto = require('./scrape-waterfront-toronto-events');
const DownsviewParkEvents = require('./scrape-downsview-park-events');
const OntarioPlaceEvents = require('./scrape-ontarioplace-events');

// 🎵 MUSIC VENUES (High Volume)
const HorseshoeTavern = require('./scrape-horseshoe-tavern');
const ElmocamboEvents = require('./scrape-elmocambo-events');
const RivoliEvents = require('./scrape-rivoli-events');
const GrossmansTable = require('./scrape-grossmans-tavern-events');
const LulaLounge = require('./scrape-lula-lounge-events');
const PoetryJazzCafe = require('./scrape-poetry-jazz-cafe-events');

// 🎭 NEW GTA MAJOR VENUES (High Volume)
const DanforthMusicHall = require('./scrape-danforth-music-hall');
const PhoenixConcertTheatre = require('./scrape-phoenix-concert-theatre');
const OperaHouse = require('./scrape-opera-house');
const LivingArtsCentre = require('./scrape-living-arts-centre');
const RoseTheatre = require('./scrape-rose-theatre');
const MarkhamTheatre = require('./scrape-markham-theatre');
const BurlingtonPerformingArts = require('./scrape-burlington-performing-arts');
const OakvilleCentre = require('./scrape-oakville-centre');
const RichmondHillCentre = require('./scrape-richmond-hill-centre');
const VaughanMillsEvents = require('./scrape-vaughan-mills-events');
const RegentTheatreOshawa = require('./scrape-regent-theatre-oshawa');
const PickeringCasinoEvents = require('./scrape-pickering-casino-events');
const UniversityOfTorontoEvents = require('./scrape-university-of-toronto-events');
const YorkUniversityEvents = require('./scrape-york-university-events');
const AjaxCommunityEvents = require('./scrape-ajax-community-events');

// 🛍️ MARKETS & DISTRICTS (High Volume)
const DistilleryDistrict = require('./scrape-distillery-district-events');
const StLawrenceMarket = require('./scrape-st-lawrence-market-events');
const StacktMarket = require('./scrape-stackt-market-events');
const KensingtonMarket = require('./scrape-kensington-market-events');
const GerrardIndiaBazaar = require('./scrape-gerrard-india-bazaar');

// 🍺 BREWERIES & BARS (Medium Volume)
const SteamWhistleEvents = require('./scrape-steam-whistle-events');
const HendersonBrewing = require('./scrape-henderson-brewing-events');
const JunctionCraft = require('./scrape-junction-craft-events');

// 🎭 THEATRES & ARTS (Medium Volume)
const SoulpepperEvents = require('./scrape-soulpepper-events');
const FactoryTheatre = require('./scrape-factory-theatre-events');
const SecondCityEvents = require('./scrape-second-city-events');
const TheatreCentreEvents = require('./scrape-theatre-centre-events');
const NativeEarthEvents = require('./scrape-native-earth-events');

// 📚 LIBRARIES & EDUCATION (Medium Volume)
const TorontoLibraryEvents = require('./scrape-toronto-library-events');
const TorontoReferenceLibrary = require('./scrape-toronto-reference-library-events');
const OCADUEvents = require('./scrape-ocadu-events');
const { processBatchWithCity } = require('../../../utils/auto-detect-city');

class TorontoScrapers {
    constructor(scrapersToRun) {
        const allScrapers = [
            // Core venues
            new MasseyHallEvents(),
            new MeridianHallEvents(),
            new RoyThomsonHallEvents(),
            new TorontoEventsOfficial(),

            // Major event source scrapers
            new TorontoCaEvents(),
            new NowPlayingTorontoEvents(),
            new TodoCanadaTorontoEvents(),

            // 🎭 NIGHTLIFE VENUES (High Volume) - Target: 200+ events
            new RebelNightclub(),
            new FictionClub(),
            new VelvetEvents(),
            new SixLounge(),
            new Club54Events(),
            new FutureNightlife(),
            new DirtyMartini(),
            new XClubEvents(),
            new VertigoEvents(),
            new UVTorontoEvents(),

            // 🏛️ MAJOR MUSEUMS & ATTRACTIONS (High Volume) - Target: 300+ events
            new ROMEvents(),
            new AGOEvents(),
            new OntarioScienceCentre(),
            new CasaLomaEvents(),
            new RipleysAquarium(),
            new CNTowerEvents(),
            new GardinerMuseum(),
            new TextileMuseum(),
            new MOCAEvents(),
            new AgaKhanMuseum(),

            // 🎪 FESTIVALS & CULTURAL EVENTS (High Volume) - Target: 200+ events
            new TIFFEvents(),
            new TorontoInternationalFilmFestival(),
            new TorontoPride(),
            new CaribaneFestival(),
            new HotDocsEvents(),

            // 🏞️ OUTDOOR & PARKS (High Volume) - Target: 150+ events
            new TorontoZooEvents(),
            new HighParkEvents(),
            new TorontoIslands(),
            new EvergreenBrickWorks(),
            new WaterfrontToronto(),
            new DownsviewParkEvents(),
            new OntarioPlaceEvents(),

            // 🎵 MUSIC VENUES (High Volume) - Target: 100+ events
            new HorseshoeTavern(),
            new ElmocamboEvents(),
            new RivoliEvents(),
            new GrossmansTable(),
            new LulaLounge(),
            new PoetryJazzCafe(),

            // 🎭 NEW GTA MAJOR VENUES (High Volume) - Target: 200+ events
            new DanforthMusicHall(),
            new PhoenixConcertTheatre(),
            new OperaHouse(),
            new LivingArtsCentre(),
            new RoseTheatre(),
            new MarkhamTheatre(),
            new BurlingtonPerformingArts(),
            new OakvilleCentre(),
            new RichmondHillCentre(),
            new VaughanMillsEvents(),
            new RegentTheatreOshawa(),
            new PickeringCasinoEvents(),

            // 🛍️ MARKETS & DISTRICTS (High Volume) - Target: 100+ events
            new DistilleryDistrict(),
            new StLawrenceMarket(),
            new StacktMarket(),
            new KensingtonMarket(),
            new GerrardIndiaBazaar(),

            // 🍺 BREWERIES & BARS (Medium Volume) - Target: 50+ events
            new SteamWhistleEvents(),
            new HendersonBrewing(),
            new JunctionCraft(),

            // 🎭 THEATRES & ARTS (Medium Volume) - Target: 100+ events
            new SoulpepperEvents(),
            new FactoryTheatre(),
            new SecondCityEvents(),
            new TheatreCentreEvents(),
            new NativeEarthEvents(),

            // 📚 LIBRARIES & EDUCATION (Medium Volume) - Target: 50+ events
            new TorontoLibraryEvents(),
            new TorontoReferenceLibrary(),
            new OCADUEvents(),

            // 🎓 UNIVERSITIES & COMMUNITY (High Volume) - Target: 150+ events
            new UniversityOfTorontoEvents(),
            new YorkUniversityEvents(),
            new AjaxCommunityEvents(),
        ];

        this.scrapers = scrapersToRun || allScrapers;

        console.log(`🎆 Toronto Scrapers initialized with ${this.scrapers.length} active scrapers!`);
        if (!scrapersToRun) {
            console.log(`🎯 Target: 1000+ Toronto events across all categories`);
        }
    }

    /**
     * Run all Toronto scrapers
     * @returns {Promise<Array>} - Aggregated events from all Toronto scrapers
     */
    async scrape() {
        console.log('🏙️ Starting Toronto scrapers...');
        const allEvents = [];

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || 'Unknown Scraper';
                console.log(`📍 Running scraper for ${source}...`);
                const events = await scraper.scrape();

                if (Array.isArray(events) && events.length > 0) {
                    // Ensure all events have Toronto city and venue info
                    const processedEvents = events.map(event => ({
                        ...event,
                        city: city,
                        venue: event.venue || (scraper.venue || { name: source }),
                        categories: [...(event.categories || []), city].filter((v, i, a) => a.indexOf(v) === i)
                    }));

                    allEvents.push(...processedEvents);
                    console.log(`✅ Found ${events.length} events from ${source}`);
                } else {
                    console.log(`⚠️ No events found from ${source}`);
                }
            } catch (error) {
                const source = scraper.source || 'Unknown Scraper';
                console.error(`❌ Error running scraper for ${source}:`, error.message);
            }
        }

        console.log(`🎉 Toronto scrapers found ${allEvents.length} events in total`);
        return allEvents;
    }
}


// AUTO-CITY DETECTION HELPER
// Ensures all events from this city have proper venue.name
function processEventsForCity(events, scraperName) {
  return processBatchWithCity(events, __filename);
}

module.exports = new TorontoScrapers();