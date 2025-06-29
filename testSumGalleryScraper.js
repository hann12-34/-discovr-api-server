const { testScraper } = require('./tools/scraper-diagnostics');
const sumGalleryScraper = require('./scrapers/venues/new/sumGallery');

testScraper(sumGalleryScraper);
