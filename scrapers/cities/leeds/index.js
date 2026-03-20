const { enhanceEvents } = require("../../utils/fetchEventDetails");

/**
 * leeds Scrapers - 41 scrapers
 */

const scrapeBelgraveMusicHall = require('./belgrave_music_hall');
const scrapeBrudenellSocial = require('./brudenell_social');
const scrapeCityVarieties = require('./city_varieties');
const scrapeEllandRoad = require('./elland_road');
const scrapeFirstDirectArena = require('./first_direct_arena');
const scrapeHeadrowHouse = require('./headrow_house');
const scrapeHydeParkBookClub = require('./hyde_park_book_club');
// Removed: leeds_beer_week - ERR_CERT_COMMON_NAME_INVALID
const scrapeLeedsChristmasLights = require('./leeds_christmas_lights');
const scrapeLeedsCocktailWeek = require('./leeds_cocktail_week');
// Removed: leeds_comedy_fest - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeLeedsDigitalFest = require('./leeds_digital_fest');
const scrapeLeedsDiwali = require('./leeds_diwali');
// Removed: leeds_dragon_boat - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeLeedsFestival = require('./leeds_festival');
const scrapeLeedsGrandTheatre = require('./leeds_grand_theatre');
const scrapeLeedsIndieFoodFest = require('./leeds_indie_food_fest');
const scrapeLeedsIntlFilmFest = require('./leeds_intl_film_fest');
const scrapeLeedsJazzFest = require('./leeds_jazz_fest');
const scrapeLeedsLightNight = require('./leeds_light_night');
const scrapeLeedsNewYears = require('./leeds_new_years');
const scrapeLeedsPlayhouse = require('./leeds_playhouse');
// Removed: leeds_pride_fest - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeLeedsVeganFest = require('./leeds_vegan_fest');
// Removed: leeds_west_indian_carnival - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeMillenniumSquare = require('./millennium_square');
const scrapeMillenniumSquareEvents = require('./millennium_square_events');
const scrapeNationOfShopkeepers = require('./nation_of_shopkeepers');
const scrapeO2academy = require('./o2academy');
const scrapeRoundhayParkConcerts = require('./roundhay_park_concerts');
// Removed: stylus - dead URL (ERR_NAME_NOT_RESOLVED)
// Removed: temple_newsam - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeTheAdelphi = require('./the_adelphi');
const scrapeTheFenton = require('./the_fenton');
const scrapeTheHifiClub = require('./the_hifi_club');
// Removed: the_library - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeThePackhorse = require('./the_packhorse');
// Removed: the_wardrobe - dead URL (ERR_NAME_NOT_RESOLVED)
// Removed: west_indian_centre - dead URL (ERR_NAME_NOT_RESOLVED)
const scrapeWireLeeds = require('./wire_leeds');
const scrapeTheWarehouseLeeds = require('./the_warehouse_leeds');
const scrapePryzmLeeds = require('./pryzm_leeds');
// Removed brudenell_v2 - fake date generation
const scrapeLeedsListEvents = require('./leeds_list_events');

const _rawExports = {
  scrapeBelgraveMusicHall,
  scrapeBrudenellSocial,
  scrapeCityVarieties,
  scrapeEllandRoad,
  scrapeFirstDirectArena,
  scrapeHeadrowHouse,
  scrapeHydeParkBookClub,
  scrapeLeedsChristmasLights,
  scrapeLeedsCocktailWeek,
  scrapeLeedsDigitalFest,
  scrapeLeedsDiwali,
  scrapeLeedsFestival,
  scrapeLeedsGrandTheatre,
  scrapeLeedsIndieFoodFest,
  scrapeLeedsIntlFilmFest,
  scrapeLeedsJazzFest,
  scrapeLeedsLightNight,
  scrapeLeedsNewYears,
  scrapeLeedsPlayhouse,
  scrapeLeedsVeganFest,
  scrapeMillenniumSquare,
  scrapeMillenniumSquareEvents,
  scrapeNationOfShopkeepers,
  scrapeO2academy,
  scrapeRoundhayParkConcerts,
  scrapeTheAdelphi,
  scrapeTheFenton,
  scrapeTheHifiClub,
  scrapeThePackhorse,
  scrapeWireLeeds,
  scrapeTheWarehouseLeeds,
  scrapePryzmLeeds,
  scrapeLeedsListEvents
};

// Wrap each scraper to enhance events with image+description from detail pages
const _wrapped = {};
for (const [k, fn] of Object.entries(_rawExports)) {
  _wrapped[k] = async (...a) => enhanceEvents(await fn(...a));
}
module.exports = _wrapped;
