/**
 * Montreal city scraper coordinator
 * Manages all Montreal venue scrapers
 */

// BARS & NIGHTLIFE
const AmereABoire = require('./scrape-amereaboire');
const BarBootlegger = require('./scrape-bar-bootlegger');
const BarDatcha = require('./scrape-bar-datcha');
const BarFurco = require('./scrape-barfurco');
const Barraca = require('./scrape-barraca');
const Belmont = require('./scrape-belmont');
const BistroAJojo = require('./scrape-bistro-a-jojo');
const Blvd44 = require('./scrape-blvd44');
const Boho = require('./scrape-boho');
const Brutopia = require('./scrape-brutopia');
const CabaretMado = require('./scrape-cabaretmado');
const CleopatraMontreal = require('./scrape-cleopatra-montreal');
const CloakroomBar = require('./scrape-cloakroom-bar');
const ClubElectricAvenue = require('./scrape-club-electric-avenue');
const ClubUnity = require('./scrape-clubunity');
const ComplexeSky = require('./scrape-complexe-sky');
const DiesOnze = require('./scrape-dies-onze');
const DieuDuCiel = require('./scrape-dieuduciel');
const Flyjin = require('./scrape-flyjin');
const FoufounesElectriques = require('./scrape-foufounes-electriques');
const Foufounes = require('./scrape-foufounes');
const Gokudo = require('./scrape-gokudo');
const Griffintown = require('./scrape-griffintown');
const JetNightclub = require('./scrape-jet-nightclub');
const LaVoute = require('./scrape-lavoute');
const LeBelmont = require('./scrape-le-belmont');
const LeStudMontreal = require('./scrape-le-stud-montreal');
const LeBalcon = require('./scrape-lebalcon');
const LeBelmont2 = require('./scrape-lebelmont');
const LeLab = require('./scrape-lelab');
const LeMalNecessaire = require('./scrape-lemalnecessaire');
const LePointDeVente = require('./scrape-lepointdevente');
const LolaRosa = require('./scrape-lola-rosa');
const MaBrasserie = require('./scrape-mabrasserie');
const MaisonNotman = require('./scrape-maisonnotman');
const MontrealNightclubs = require('./scrape-montrealnightclubs');
const MontRoyal = require('./scrape-montroyal');
const NewCityGas = require('./scrape-new-city-gas');
const NewspeakMontreal = require('./scrape-newspeak-montreal');
const NewspeakMtl = require('./scrape-newspeak-mtl');
const PochaMtl = require('./scrape-pocha-mtl');
const PubSaintPierre = require('./scrape-pubsaintpierre');
const Salsatheque = require('./scrape-salsatheque');
const TaverneMidway = require('./scrape-tavernemidway');
const ThePasstime = require('./scrape-thepastime');
const YeOldeOrchard = require('./scrape-yeoldeorchard');

// FESTIVALS & EVENTS
const FantasiaFilmFestival = require('./scrape-fantasia-film-festival');
const IleSoniqFestival = require('./scrape-ilesoniq-festival');
const JustForLaughs = require('./scrape-just-for-laughs');
const LaGrandeRoueDeMontreal = require('./scrape-lagranderouedemontreal');
const MontrealPride = require('./scrape-montreal-pride');
const MuralFestival = require('./scrape-mural-festival');
const NuitsAfrique = require('./scrape-nuits-afrique');
const OsheagaFestival = require('./scrape-osheaga-festival');
const PiknicElektronik = require('./scrape-piknic-electronik');

// CULTURAL & ARTS
const MontrealScienceCentre = require('./scrape-montreal-science-centre');
const MtlOrg = require('./scrape-mtl-org');
const PlaceDesArts = require('./scrape-place-des-arts');
const StudioTd = require('./scrape-studio-td');
const UndergroundCity = require('./scrape-undergroundcity');
const VieuxMontreal = require('./scrape-vieux-montreal');
const { processBatchWithCity } = require('../../../utils/auto-detect-city');

class MontrealScrapers {
    constructor() {
        this.scrapers = [
            // BARS & NIGHTLIFE (High Volume)
            // new AmereABoire(), // TODO: Fix - exports functions not a class
            // new BarBootlegger(), // TODO: Fix - exports functions not a class
            // new BarDatcha(), // TODO: Fix - exports functions not a class
            // new BarFurco(), // TODO: Fix - exports functions not a class
            // new Barraca(), // TODO: Fix - exports functions not a class
            // new Belmont(), // TODO: Fix - exports functions not a class
            // new BistroAJojo(), // TODO: Fix - exports functions not a class
            // new Blvd44(), // TODO: Fix - exports functions not a class
            // new Boho(), // TODO: Fix - exports functions not a class
            // new Brutopia(), // TODO: Fix - exports functions not a class
            // new CabaretMado(), // TODO: Fix - exports functions not a class
            // new CleopatraMontreal(), // TODO: Fix - exports functions not a class
            // new CloakroomBar(), // TODO: Fix - exports functions not a class
            // new ClubElectricAvenue(), // TODO: Fix - exports functions not a class
            // new ClubUnity(), // TODO: Fix - exports functions not a class
            new ComplexeSky(),
            // new DiesOnze(), // TODO: Fix - exports functions not a class
            // new DieuDuCiel(), // TODO: Fix - exports functions not a class
            // new Flyjin(), // TODO: Fix - exports functions not a class
            // new FoufounesElectriques(), // TODO: Fix - exports functions not a class
            // new Foufounes(), // TODO: Fix - exports functions not a class
            // new Gokudo(), // TODO: Fix - exports functions not a class
            // new Griffintown(), // TODO: Fix - exports functions not a class
            // new JetNightclub(), // TODO: Fix - exports functions not a class
            // new LaVoute(), // TODO: Fix - exports functions not a class
            // new LeBelmont(), // TODO: Fix - exports functions not a class
            // new LeStudMontreal(), // TODO: Fix - exports functions not a class
            // new LeBalcon(), // TODO: Fix - exports functions not a class
            // new LeBelmont2(), // TODO: Fix - exports functions not a class
            // new LeLab(), // TODO: Fix - exports functions not a class
            // new LeMalNecessaire(), // TODO: Fix - exports functions not a class
            // new LePointDeVente(), // TODO: Fix - exports functions not a class
            // new LolaRosa(), // TODO: Fix - exports functions not a class
            // new MaBrasserie(), // TODO: Fix - exports functions not a class
            // new MaisonNotman(), // TODO: Fix - exports functions not a class
            // new MontrealNightclubs(), // TODO: Fix - exports functions not a class
            // new MontRoyal(), // TODO: Fix - exports functions not a class
            // new NewCityGas(), // TODO: Fix - exports functions not a class
            // new NewspeakMontreal(), // TODO: Fix - exports functions not a class
            // new NewspeakMtl(), // TODO: Fix - exports functions not a class
            // new PochaMtl(), // TODO: Fix - exports functions not a class
            // new PubSaintPierre(), // TODO: Fix - exports functions not a class
            // new Salsatheque(), // TODO: Fix - exports functions not a class
            // new TaverneMidway(), // TODO: Fix - exports functions not a class
            // new ThePasstime(), // TODO: Fix - exports functions not a class
            // new YeOldeOrchard(), // TODO: Fix - exports functions not a class
            
            // FESTIVALS & EVENTS (High Volume)
            // new FantasiaFilmFestival(), // TODO: Fix - exports functions not a class
            // new IleSoniqFestival(), // TODO: Fix - exports functions not a class
            // new JustForLaughs(), // TODO: Fix - exports functions not a class
            // new LaGrandeRoueDeMontreal(), // TODO: Fix - exports functions not a class
            // new MontrealPride(), // TODO: Fix - exports functions not a class
            // new MuralFestival(), // TODO: Fix - exports functions not a class
            // new NuitsAfrique(), // TODO: Fix - exports functions not a class
            // new OsheagaFestival(), // TODO: Fix - exports functions not a class
            // new PiknicElektronik(), // TODO: Fix - exports functions not a class
            
            // CULTURAL & ARTS (Medium Volume)
            new MontrealScienceCentre(),
            // new MtlOrg(), // TODO: Fix - exports functions not a class
            // new PlaceDesArts(), // TODO: Fix - exports functions not a class
            // new StudioTd(), // TODO: Fix - exports functions not a class
            // new UndergroundCity(), // TODO: Fix - exports functions not a class
            new VieuxMontreal(),
        ];
        
        console.log(`🎆 Montreal Scrapers initialized with ${this.scrapers.length} active scrapers!`);
        console.log(`🎯 Target: 500+ Montreal events across all categories`);
    }

    async scrape() {
        console.log('🚀 Starting Montreal scrapers...'.cyan.bold);
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
        
        console.log(`🎯 Montreal total: ${totalEvents} events from ${this.scrapers.length} scrapers`.cyan.bold);
        return allEvents;
    }
}


// AUTO-CITY DETECTION HELPER
// Ensures all events from this city have proper venue.name
function processEventsForCity(events, scraperName) {
  return processBatchWithCity(events, __filename);
}

module.exports = new MontrealScrapers();
