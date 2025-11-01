/**
 * Scotiabank Saddledome Events Scraper (Calgary)
 * Home of the Calgary Flames (NHL)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const SaddledomeEvents = {
  async scrape(city) {
    console.log('🔥 Scraping Saddledome events (Calgary Flames + Concerts)...');
    
    try {
      const events = [];
      const seen = new Set();
      
      // Get Calgary Flames schedule from NHL API
      console.log('Fetching Calgary Flames games...');
      try {
        const nhlResponse = await axios.get('https://api-web.nhle.com/v1/club-schedule-season/cgy/now', {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          },
          timeout: 15000
        });
        
        if (nhlResponse.data && nhlResponse.data.games) {
          nhlResponse.data.games.forEach(game => {
            const gameDate = game.gameDate;
            const homeTeam = game.homeTeam?.placeName?.default || '';
            const awayTeam = game.awayTeam?.placeName?.default || '';
            
            // Only include home games at Saddledome
            if (homeTeam === 'Calgary' && gameDate) {
              const title = `Calgary Flames vs ${awayTeam}`;
              
              if (!seen.has(gameDate + title)) {
                seen.add(gameDate + title);
                
                console.log(`✓ ${title} | ${gameDate}`);
                
                events.push({
                  id: uuidv4(),
                  title: title,
                  date: gameDate,
                  time: game.startTimeUTC || null,
                  url: `https://www.nhl.com/flames/schedule`,
                  venue: { name: 'Scotiabank Saddledome', address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1', city: 'Calgary' },
                  location: 'Calgary, AB',
                  description: `${title} at Scotiabank Saddledome.`,
                  category: 'Sports',
                  image: null,
                  source: 'Saddledome',
                  city: 'Calgary'
                });
              }
            }
          });
        }
      } catch (nhlError) {
        console.log('NHL API error:', nhlError.message);
      }
      
      console.log(`\n✅ Found ${events.length} Saddledome events`);
      return filterEvents(events);
      
    } catch (error) {
      console.error('Error scraping Saddledome:', error.message);
      return [];
    }
  }
};

module.exports = SaddledomeEvents.scrape;
