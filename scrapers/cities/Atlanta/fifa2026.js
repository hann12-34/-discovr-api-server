/**
 * FIFA World Cup 2026 - Atlanta
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 */
const { getFifa2026Matches } = require('../../utils/fifa2026Schedule');
const { filterEvents } = require('../../utils/eventFilter');

module.exports = async function scrape(city) {
  console.log('⚽ Scraping FIFA World Cup 2026 matches for Atlanta...');
  const matches = await getFifa2026Matches('Atlanta');
  const filtered = filterEvents(matches);
  console.log('  ✅ ' + filtered.length + ' FIFA 2026 Atlanta matches');
  return filtered;
};
