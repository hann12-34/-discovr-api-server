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

class MontrealScrapers {
    constructor() {
        this.scrapers = [
            // BARS & NIGHTLIFE (High Volume)
            new AmereABoire(),
            new BarBootlegger(),
            new BarDatcha(),
            new BarFurco(),
            new Barraca(),
            new Belmont(),
            new BistroAJojo(),
            new Blvd44(),
            new Boho(),
            new Brutopia(),
            new CabaretMado(),
            new CleopatraMontreal(),
            new CloakroomBar(),
            new ClubElectricAvenue(),
            new ClubUnity(),
            new ComplexeSky(),
            new DiesOnze(),
            new DieuDuCiel(),
            new Flyjin(),
            new FoufounesElectriques(),
            new Foufounes(),
            new Gokudo(),
            new Griffintown(),
            new JetNightclub(),
            new LaVoute(),
            new LeBelmont(),
            new LeStudMontreal(),
            new LeBalcon(),
            new LeBelmont2(),
            new LeLab(),
            new LeMalNecessaire(),
            new LePointDeVente(),
            new LolaRosa(),
            new MaBrasserie(),
            new MaisonNotman(),
            new MontrealNightclubs(),
            new MontRoyal(),
            new NewCityGas(),
            new NewspeakMontreal(),
            new NewspeakMtl(),
            new PochaMtl(),
            new PubSaintPierre(),
            new Salsatheque(),
            new TaverneMidway(),
            new ThePasstime(),
            new YeOldeOrchard(),
            
            // FESTIVALS & EVENTS (High Volume)
            new FantasiaFilmFestival(),
            new IleSoniqFestival(),
            new JustForLaughs(),
            new LaGrandeRoueDeMontreal(),
            new MontrealPride(),
            new MuralFestival(),
            new NuitsAfrique(),
            new OsheagaFestival(),
            new PiknicElektronik(),
            
            // CULTURAL & ARTS (Medium Volume)
            new MontrealScienceCentre(),
            new MtlOrg(),
            new PlaceDesArts(),
            new StudioTd(),
            new UndergroundCity(),
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

module.exports = new MontrealScrapers();
