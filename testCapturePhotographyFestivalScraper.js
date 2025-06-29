const { testScraper } = require('./tools/scraper-diagnostics');
const captureScraper = require('./scrapers/venues/new/capturePhotographyFestival');

testScraper(captureScraper);
