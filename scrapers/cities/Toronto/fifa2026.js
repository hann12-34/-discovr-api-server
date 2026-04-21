/**
 * FIFA World Cup 2026 - Toronto
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 */
const { getFifa2026Matches } = require('../../utils/fifa2026Schedule');
const { filterEvents } = require('../../utils/eventFilter');

module.exports = async function scrape(city) {
  console.log('⚽ Scraping FIFA World Cup 2026 matches for Toronto...');
  const matches = await getFifa2026Matches('Toronto');
  const filtered = filterEvents(matches);
  console.log('  ✅ ' + filtered.length + ' FIFA 2026 Toronto matches');
  return filtered;
};
