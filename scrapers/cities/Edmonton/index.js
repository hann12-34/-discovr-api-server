/**
 * Edmonton Scrapers - 50 scrapers (focused on nightlife + working venues)
 */

const scrapeWinspearCentreEdmonton = require('./scrape-winspear-centre-edmonton');
const scrapeRogersplace = require('./rogersplace');
const scrapeStarlite = require('./starlite');
const scrapeExpoCentre = require('./expoCentre');
const scrapeRiverCree = require('./riverCree');
const scrapeTheatreNetwork = require('./theatreNetwork');
const scrapeCommonwealthStadium = require('./commonwealthstadium');
const scrapeMacEwan = require('./macewan');
const scrapeATBArts = require('./atbfinancialarts');
const scrapeRoyalAlbertaMuseum = require('./royalalbertamuseum');
const scrapeTelfordHouse = require('./telfordhouse');
const scrapeIceDistrict = require('./icedistrict');
const scrapeCenturyCasino = require('./centurycasino');
const scrapeWhyteAve = require('./whyteave');
// winspear v1 removed (winspear2 covers same venue)
// jubilee v1 removed (jubilee2 covers same venue)
const scrapeUnionhall = require('./unionhall');
// citadeltheatre v1 removed (citadel2 covers same venue)
const scrapeYardbirdSuite = require('./yardbirdSuite');
const scrapeBluesOnWhyte = require('./bluesOnWhyte');
const scrapeNeedleVinyl = require('./needlevinyl');
const scrapeCatalystTheatre = require('./catalystTheatre');
const scrapeVarscona = require('./varscona');
const scrapeRapidFireTheatre = require('./rapidFireTheatre');
const scrapeEdmontonfolkfest = require('./edmontonfolkfest');
const scrapeEdmontonjazz = require('./edmontonjazz');
const scrapeFringe = require('./fringe');
const scrapeKdays = require('./k-days');
const scrapeArtGalleryAlberta = require('./artGalleryAlberta');
const scrapeShawConference = require('./shawConference');
const scrapeAlbertaBallet = require('./albertaBallet');
const scrapeEdmontonSymphony = require('./edmontonSymphony');
const scrapeEdmontonOpera = require('./edmontonOpera');
const scrapeRanchRoadhouse = require('./ranchroadhouse');
const scrapeRecRoom = require('./recroomedm');
const scrapeKingswayMall = require('./kingswaymall');
const scrapeSouthgateCentre = require('./southgatecentre');
const scrapeEdmontonRiverhawks = require('./edmontonriverhawks');
const scrapeOilers = require('./oilers');
const scrapeElks = require('./elks');
const scrapeWEM = require('./wem');
const scrapeCitadel2 = require('./citadel2');
const scrapeWinspear2 = require('./winspear2');
const scrapeJubilee2 = require('./jubilee2');
const scrapeEdmontonValleyZoo = require('./edmontonvalley');
const scrapeFortEdmonton = require('./fortedmonton');
const scrapeTelus = require('./telaboreum');
const scrapeEdmCityEvents = require('./edmcityevents');
const scrapeEdmLibrary = require('./edmlibrary');
// Removed: edmmotoshow - timeout
const scrapeOilKings = require('./edmoilkings');
// Removed: edmnightlife - dead URL
// Removed: edmsports - certificate error
const scrapeEdmUnion = require('./edmunion');
const scrapeEdmPools = require('./edmpools');
const scrapeEdmArtsCouncil = require('./edmartscouncil');
// Removed: edmnewcity - dead URL
const scrapeEdmPride = require('./edmpride');
const scrapeEdmSherwood = require('./edmsherwood');
const scrapeEdmConcertHall = require('./edmconcerthall');
const scrape99ten = require('./ninetynineten'); // REBUILT - fast single-page scrape
const scrapeMidwayMusicHall = require('./midwaymusichall');
const scrapeTheCommon = require('./thecommon');

const { enhanceEvents } = require('../../utils/fetchEventDetails');

const _rawScrapers = {
  scrapeRogersplace,
  scrapeStarlite,
  scrapeExpoCentre,
  scrapeRiverCree,
  scrapeTheatreNetwork,
  scrapeCommonwealthStadium,
  scrapeMacEwan,
  scrapeATBArts,
  scrapeRoyalAlbertaMuseum,
  scrapeTelfordHouse,
  scrapeIceDistrict,
  scrapeCenturyCasino,
  scrapeWhyteAve,
  scrapeUnionhall,
  scrapeYardbirdSuite,
  scrapeBluesOnWhyte,
  scrapeNeedleVinyl,
  scrapeCatalystTheatre,
  scrapeVarscona,
  scrapeRapidFireTheatre,
  scrapeEdmontonfolkfest,
  scrapeEdmontonjazz,
  scrapeFringe,
  scrapeKdays,
  scrapeArtGalleryAlberta,
  scrapeShawConference,
  scrapeAlbertaBallet,
  scrapeEdmontonSymphony,
  scrapeEdmontonOpera,
  scrapeRanchRoadhouse,
  scrapeRecRoom,
  scrapeKingswayMall,
  scrapeSouthgateCentre,
  scrapeEdmontonRiverhawks,
  scrapeOilers,
  scrapeElks,
  scrapeWEM,
  scrapeCitadel2, // Citadel Theatre
  scrapeWinspear2, // Winspear Centre
  scrapeJubilee2, // Jubilee Auditorium
  scrapeEdmontonValleyZoo,
  scrapeFortEdmonton,
  scrapeTelus,
  scrapeEdmCityEvents,
  scrapeEdmLibrary,
  scrapeOilKings,
  scrapeEdmUnion,
  scrapeEdmPools,
  scrapeEdmArtsCouncil,
  scrapeEdmPride,
  scrapeEdmSherwood,
  scrapeEdmConcertHall,
  scrape99ten,
  scrapeMidwayMusicHall,
  scrapeTheCommon,
  scrapeWinspearCentreEdmonton,
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [key, fn] of Object.entries(_rawScrapers)) {
  _wrapped[key] = async (...args) => enhanceEvents(await fn(...args));
}

module.exports = _wrapped;
