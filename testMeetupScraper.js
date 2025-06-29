const { testScraper } = require('./tools/scraper-diagnostics.js');
const meetupScraper = require('./scrapers/sources/meetupScraper.js');

console.log('Starting isolated test for Meetup scraper...');

if (meetupScraper) {
  // Run the test
  testScraper(meetupScraper)
    .then(result => {
      console.log('Test finished.');
      // For detailed results, uncomment the line below
      // console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('Test failed with a critical error:', error);
    });
} else {
  console.error('Could not load Meetup scraper directly.');
}
