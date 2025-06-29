const { testScraper } = require('./tools/scraper-diagnostics.js');
const seymourArtGalleryScraper = require('./scrapers/venues/new/seymourArtGallery.js');

console.log('Starting isolated test for Seymour Art Gallery scraper...');

if (seymourArtGalleryScraper) {
  testScraper(seymourArtGalleryScraper)
    .then(result => {
      console.log('Test finished.');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Test failed with a critical error:', error);
    });
} else {
  console.error('Could not load Seymour Art Gallery scraper directly.');
}
