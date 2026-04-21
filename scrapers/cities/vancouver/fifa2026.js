/**
 * FIFA World Cup 2026 - Vancouver (BC Place)
 * Source: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 */
const { getFifa2026Matches } = require('../../utils/fifa2026Schedule');
const { filterEvents } = require('../../utils/eventFilter');

module.exports = async function scrape(city) {
  console.log('⚽ Scraping FIFA World Cup 2026 matches for Vancouver...');
  const matches = await getFifa2026Matches('Vancouver');
  const filtered = filterEvents(matches);
  console.log(`  ✅ ${filtered.length} FIFA 2026 Vancouver matches`);
  return filtered;
};
