const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * Portland Scrapers - Cleaned (1 per venue)
 */

const scrapeAladdinTheater = require('./aladdin_theater');
const scrapeAnalogCafe = require('./analog_cafe');
const scrapeArleneSchnitzer = require('./arlene_schnitzer');
const scrapeArtistsRepertory = require('./artists_repertory');
const scrapeAxeAndFiddle = require('./axe_and_fiddle');
const scrapeBossanovaBallroom = require('./bossanova_ballroom');
const scrapeBridgetownComedy = require('./bridgetown_comedy');
const scrapeBunkBar = require('./bunk_bar');
const scrapeCascadeBrewing = require('./cascade_brewing');
const scrapeCrystalballroom = require('./crystalballroom');
const scrapeDantePdx = require('./dante_pdx');
const scrapeDougFir = require('./doug_fir');
const scrapeEdgefield = require('./edgefield');
const scrapeHawthorneTheatre = require('./hawthorne_theatre');
const scrapeHolocene = require('./holocenePortland');
const scrapeJackLondonRevue = require('./jack_london_revue');
const scrapeKellerAuditorium = require('./keller_auditorium');
const scrapeKellsIrish = require('./kells_irish');
const scrapeKellyClub = require('./kelly_club');
const scrapeLaurelthirst = require('./laurelthirst');
const scrapeLolaRoom = require('./lola_room');
const scrapeMcmenaminsKennedy = require('./mcmenamins_kennedy');
const scrapeMississippiStudios = require('./mississippi_studios');
const scrapeModaCenter = require('./moda_center');
const scrapeNewmarkTheater = require('./newmark_theater');
const scrapeParisTheatre = require('./paris_theatre');
const scrapePolarisHall = require('./polaris_hall');
const scrapePortlandMercury = require('./portland_mercury');
const scrapeRevolutionHall = require('./revolution_hall');
const scrapeRoselandTheater = require('./roseland_theater');
const scrapeRoselandPortland = require('./roselandPortland');
const scrapeSomedayLounge = require('./someday_lounge');
const scrapeStarTheater = require('./star_theater');
const scrapeTheGoodfoot = require('./the_goodfoot');
const scrapeTheatreProjects = require('./theatre_projects');
const scrapeTiffanyCenter = require('./tiffany_center');
const scrapeTurnTurnTurn = require('./turn_turn_turn');
const scrapeValentines = require('./valentines');
const scrapeWhiteEagle = require('./white_eagle');
const scrapeWonderBallroom = require('./wonder_ballroom');
const scrape45EastPortland = require('./45east_portland');
const scrapePortland5Centers = require('./portland5_centers');
const scrapeWonderBallroomNew = require('./wonder_ballroom_new');
const scrapeRevolutionHallNew = require('./revolution_hall_new');
const scrapeRoselandNew = require('./roseland_new');
const scrapeHawthorneNew = require('./hawthorne_new');
const scrapeDougFirNew = require('./doug_fir_new');
const scrapeMississippiNew = require('./mississippi_new');
const scrapeModaCenterPortland = require('./scrape-moda-center-portland');

const _rawExports = {
  scrapeAladdinTheater,
  scrapeAnalogCafe,
  scrapeArleneSchnitzer,
  scrapeArtistsRepertory,
  scrapeAxeAndFiddle,
  scrapeBossanovaBallroom,
  scrapeBridgetownComedy,
  scrapeBunkBar,
  scrapeCascadeBrewing,
  scrapeCrystalballroom,
  scrapeDantePdx,
  scrapeDougFir,
  scrapeEdgefield,
  scrapeHawthorneTheatre,
  scrapeHolocene,
  scrapeJackLondonRevue,
  scrapeKellerAuditorium,
  scrapeKellsIrish,
  scrapeKellyClub,
  scrapeLaurelthirst,
  scrapeLolaRoom,
  scrapeMcmenaminsKennedy,
  scrapeMississippiStudios,
  scrapeModaCenter,
  scrapeNewmarkTheater,
  scrapeParisTheatre,
  scrapePolarisHall,
  scrapePortlandMercury,
  scrapeRevolutionHall,
  scrapeRoselandTheater,
  scrapeRoselandPortland,
  scrapeSomedayLounge,
  scrapeStarTheater,
  scrapeTheGoodfoot,
  scrapeTheatreProjects,
  scrapeTiffanyCenter,
  scrapeTurnTurnTurn,
  scrapeValentines,
  scrapeWhiteEagle,
  scrapeWonderBallroom,
  scrape45EastPortland,
  scrapePortland5Centers,
  scrapeWonderBallroomNew,
  scrapeRevolutionHallNew,
  scrapeRoselandNew,
  scrapeHawthorneNew,
  scrapeDougFirNew,
  scrapeMississippiNew,
  scrapeModaCenterPortland,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
