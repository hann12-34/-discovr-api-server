/**
 * Calgary city scraper coordinator
 * Manages all Calgary venue scrapers
 */

// MAJOR VENUES & ATTRACTIONS
const ArtsCommons = require('./scrape-arts-commons');
const AtticBarStage = require('./scrape-attic-bar-stage');
const BellaConCertHallEnhanced = require('./scrape-bella-concert-hall-enhanced');
const BoudoirNightclub = require('./scrape-boudoir-nightclub');
const BowValleyCollege = require('./scrape-bow-valley-college');
const BownnessPark = require('./scrape-bowness-park');
const CalgaryTowerEnhanced = require('./scrape-calgary-tower-enhanced');
const CalgaryZooEnhanced = require('./scrape-calgary-zoo-enhanced');
const ChinookCentre = require('./scrape-chinook-centre');
const ComedyCave = require('./scrape-comedy-cave');
const CowboysNightclub = require('./scrape-cowboys-nightclub');
const CraftBeerMarket = require('./scrape-craft-beer-market');
const CrossironMills = require('./scrape-crossiron-mills');
const DickensPub = require('./scrape-dickens-pub');
const EdworthyPark = require('./scrape-edworthy-park');
const FishCreekPark = require('./scrape-fish-creek-park');
const GlenbowMuseum = require('./scrape-glenbow-museum');
const GreyEagleCasino = require('./scrape-grey-eagle-casino');
const HeritagePark = require('./scrape-heritage-park');
const InglewoodBirdSanctuary = require('./scrape-inglewood-bird-sanctuary');
const IronwoodStageEnhanced = require('./scrape-ironwood-stage-enhanced');
const JubileeAuditorium = require('./scrape-jubilee-auditorium');
const KensingtonEventsEnhanced = require('./scrape-kensington-events-enhanced');
const KensingtonPub = require('./scrape-kensington-pub');
const KingEddy = require('./scrape-king-eddy');
const MacHallConcertsEnhanced = require('./scrape-mac-hall-concerts-enhanced');
const MarketMall = require('./scrape-market-mall');
const ModernLove = require('./scrape-modern-love');
const MountRoyalUniversityEnhanced = require('./scrape-mount-royal-university-enhanced');
const NationalMusicCentre = require('./scrape-national-music-centre');
const PalaceTheatre = require('./scrape-palace-theatre');
const Palomino = require('./scrape-palomino');
const PrincesIslandPark = require('./scrape-princes-island-park');
const RecRoom = require('./scrape-rec-room');
const Saddledome = require('./scrape-saddledome');
const Sait = require('./scrape-sait');
const ShipAnchor = require('./scrape-ship-anchor');
const SouthcentreMall = require('./scrape-southcentre-mall');
const SpruceMeadows = require('./scrape-spruce-meadows');
const StudioBell = require('./scrape-studio-bell');
const TelusSparkEnhanced = require('./scrape-telus-spark-enhanced');
const TheatreCalgary = require('./scrape-theatre-calgary');
const TicketmasterCalgaryEnhanced = require('./scrape-ticketmaster-calgary-enhanced');
const UniversityOfCalgaryEnhanced = require('./scrape-university-of-calgary-enhanced');
const Uptown17 = require('./scrape-uptown-17');
const VillageCrossroads = require('./scrape-village-crossroads');
const WestVillage = require('./scrape-west-village');
const WildRoseBrewery = require('./scrape-wild-rose-brewery');
const WinsportEnhanced = require('./scrape-winsport-enhanced');

// FESTIVALS & EVENTS
const BanffLakeLouiseEvents = require('./scrape-banff-lake-louise-events');
const CalgaryBluesFestival = require('./scrape-calgary-blues-festival');
const CalgaryDowntownEvents = require('./scrape-calgary-downtown-events');
const CalgaryEvents = require('./scrape-calgary-events');
const CalgaryExpo = require('./scrape-calgary-expo');
const CalgaryFarmersMarketEnhanced = require('./scrape-calgary-farmers-market-enhanced');
const CalgaryFolkFestival = require('./scrape-calgary-folk-festival');
const CalgaryNightlife = require('./scrape-calgary-nightlife');
const CalgaryOpera = require('./scrape-calgary-opera');
const CalgaryPhilharmonic = require('./scrape-calgary-philharmonic');
const CalgaryPublicLibraryEnhanced = require('./scrape-calgary-public-library-enhanced');
const CalgaryStampede = require('./scrape-calgary-stampede');
const CanmoreEvents = require('./scrape-canmore-events');
const CowboyMusicFestival = require('./scrape-cowboy-music-festival');
const EventbriteCalgary = require('./scrape-eventbrite-calgary');
const FacebookEventsCalgary = require('./scrape-facebook-events-calgary');
const GlobalfestFestival = require('./scrape-globalfest-festival');
const MeetupCalgaryEnhanced = require('./scrape-meetup-calgary-enhanced');
const SkiLouiseEvents = require('./scrape-ski-louise-events');
const SledIsland = require('./scrape-sled-island');
const StampedeFestival = require('./scrape-stampede-festival');
const { processBatchWithCity } = require('../../../utils/auto-detect-city');

class CalgaryScrapers {
    constructor() {
        this.scrapers = [
            // MAJOR VENUES & ATTRACTIONS (High Volume)
            new ArtsCommons(),
            new AtticBarStage(),
            new BellaConCertHallEnhanced(),
            new BoudoirNightclub(),
            new BowValleyCollege(),
            new BownnessPark(),
            new CalgaryTowerEnhanced(),
            new CalgaryZooEnhanced(),
            new ChinookCentre(),
            new ComedyCave(),
            new CowboysNightclub(),
            new CraftBeerMarket(),
            new CrossironMills(),
            new DickensPub(),
            new EdworthyPark(),
            new FishCreekPark(),
            new GlenbowMuseum(),
            new GreyEagleCasino(),
            new HeritagePark(),
            new InglewoodBirdSanctuary(),
            new IronwoodStageEnhanced(),
            new JubileeAuditorium(),
            new KensingtonEventsEnhanced(),
            new KensingtonPub(),
            new KingEddy(),
            new MacHallConcertsEnhanced(),
            new MarketMall(),
            new ModernLove(),
            new MountRoyalUniversityEnhanced(),
            new NationalMusicCentre(),
            new PalaceTheatre(),
            new Palomino(),
            new PrincesIslandPark(),
            new RecRoom(),
            new Saddledome(),
            new Sait(),
            new ShipAnchor(),
            new SouthcentreMall(),
            new SpruceMeadows(),
            new StudioBell(),
            new TelusSparkEnhanced(),
            new TheatreCalgary(),
            new TicketmasterCalgaryEnhanced(),
            new UniversityOfCalgaryEnhanced(),
            new Uptown17(),
            new VillageCrossroads(),
            new WestVillage(),
            new WildRoseBrewery(),
            new WinsportEnhanced(),
            
            // FESTIVALS & EVENTS (High Volume)
            new BanffLakeLouiseEvents(),
            new CalgaryBluesFestival(),
            new CalgaryDowntownEvents(),
            new CalgaryEvents(),
            new CalgaryExpo(),
            new CalgaryFarmersMarketEnhanced(),
            new CalgaryFolkFestival(),
            new CalgaryNightlife(),
            new CalgaryOpera(),
            new CalgaryPhilharmonic(),
            new CalgaryPublicLibraryEnhanced(),
            new CalgaryStampede(),
            new CanmoreEvents(),
            new CowboyMusicFestival(),
            new EventbriteCalgary(),
            new FacebookEventsCalgary(),
            // new GlobalfestFestival(), // TODO: Fix - exports functions not a class
            new MeetupCalgaryEnhanced(),
            new SkiLouiseEvents(),
            new SledIsland(),
            // new StampedeFestival(), // TODO: Fix - exports functions not a class
        ];
        
        console.log(`🎆 Calgary Scrapers initialized with ${this.scrapers.length} active scrapers!`);
        console.log(`🎯 Target: 600+ Calgary events across all categories`);
    }

    async scrape() {
        console.log('🚀 Starting Calgary scrapers...'.cyan.bold);
        const allEvents = [];
        let totalEvents = 0;
        
        for (const scraper of this.scrapers) {
            try {
                console.log(`Running ${scraper.constructor.name}...`.gray);
                const events = await scraper.scrape();
                if (events && events.length > 0) {
                    allEvents.push(...events);
                    totalEvents += events.length;
                    console.log(`✅ ${scraper.constructor.name}: ${events.length} events`.green);
                } else {
                    console.log(`⚠️ ${scraper.constructor.name}: 0 events`.yellow);
                }
            } catch (error) {
                console.error(`❌ ${scraper.constructor.name} failed: ${error.message}`.red);
            }
        }
        
        console.log(`🎯 Calgary total: ${totalEvents} events from ${this.scrapers.length} scrapers`.cyan.bold);
        return allEvents;
    }
}


// AUTO-CITY DETECTION HELPER
// Ensures all events from this city have proper venue.name
function processEventsForCity(events, scraperName) {
  return processBatchWithCity(events, __filename);
}

module.exports = new CalgaryScrapers();
