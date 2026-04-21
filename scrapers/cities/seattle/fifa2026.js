/**
 * FIFA World Cup 2026 - Seattle
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 */
const { getFifa2026Matches } = require('../../utils/fifa2026Schedule');
const { filterEvents } = require('../../utils/eventFilter');

module.exports = async function scrape(city) {
  console.log('⚽ Scraping FIFA World Cup 2026 matches for Seattle...');
  const matches = await getFifa2026Matches('Seattle');
  const filtered = filterEvents(matches);
  console.log('  ✅ ' + filtered.length + ' FIFA 2026 Seattle matches');
  return filtered;
};
