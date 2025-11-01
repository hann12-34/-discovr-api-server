/**
 * Scotiabank Arena Events Scraper (Toronto)
 * Home of the Toronto Maple Leafs (NHL) and Toronto Raptors (NBA)
 * Plus major concerts and events
 */

const axios = require('axios');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const ScotiabankArenaEvents = {
  async scrape(city) {
    console.log('🏒 Scraping Scotiabank Arena events (Leafs + Raptors + Concerts)...');
    
    try {
      const events = [];
      const seen = new Set();
      
      // 1. Get Maple Leafs schedule from NHL API
      console.log('Fetching Maple Leafs games...');
      try {
        const nhlResponse = await axios.get('https://api-web.nhle.com/v1/club-schedule-season/tor/now', {
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
            
            // Only include home games at Scotiabank Arena
            if (homeTeam === 'Toronto' && gameDate) {
              const title = `Toronto Maple Leafs vs ${awayTeam}`;
              
              if (!seen.has(gameDate + title)) {
                seen.add(gameDate + title);
                
                console.log(`✓ ${title} | ${gameDate}`);
                
                events.push({
                  id: uuidv4(),
                  title: title,
                  date: gameDate,
                  time: game.startTimeUTC || null,
                  url: `https://www.nhl.com/mapleleafs/schedule`,
                  venue: { name: 'Scotiabank Arena', address: '40 Bay Street, Toronto, ON M5J 2X2', city: 'Toronto' },
                  location: 'Toronto, ON',
                  description: `${title} at Scotiabank Arena.`,
                  category: 'Sports',
                  image: null,
                  source: 'Scotiabank Arena',
                  city: 'Toronto'
                });
              }
            }
          });
        }
      } catch (nhlError) {
        console.log('NHL API error:', nhlError.message);
      }
      
      // 2. Get Raptors schedule from NBA (simplified - would need proper NBA API)
      console.log('Fetching Raptors games...');
      // Note: NBA API would go here - for now we'll get concerts
      
      // 3. Get concerts and other events using Puppeteer
      console.log('Fetching concerts with headless browser...');
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        
        console.log('Loading Scotiabank Arena events page...');
        await page.goto('https://www.scotiabankarena.com/events', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract event data
        const eventData = await page.evaluate(() => {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          const allEvents = [];
          
          scripts.forEach(script => {
            try {
              const data = JSON.parse(script.textContent);
              const eventList = Array.isArray(data) ? data : [data];
              eventList.forEach(item => {
                if (item['@type'] === 'Event') {
                  allEvents.push(item);
                }
              });
            } catch (e) {}
          });
          
          return allEvents;
        });
        
        console.log(`Found ${eventData.length} events from website`);
        
        eventData.forEach(event => {
          if (event.name) {
            const title = event.name
              .replace(/&#8211;/g, '–')
              .replace(/&amp;/g, '&')
              .replace(/&#8217;/g, "'");
            
            // Skip Leafs/Raptors games (already got from APIs)
            if (title.toLowerCase().includes('maple leafs') || title.toLowerCase().includes('raptors')) {
              return;
            }
            
            let eventDate = null;
            if (event.startDate) {
              const dateMatch = event.startDate.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (dateMatch) {
                eventDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
              }
            }
            
            const key = title + eventDate;
            if (!seen.has(key) && eventDate) {
              seen.add(key);
              
              let category = 'Concert';
              if (title.toLowerCase().includes('ufc') || title.toLowerCase().includes('wwe')) {
                category = 'Sports';
              }
              
              console.log(`✓ ${title} | ${eventDate}`);
              
              events.push({
                id: uuidv4(),
                title: title,
                date: eventDate,
                time: null,
                url: event.url || 'https://www.scotiabankarena.com/events',
                venue: { name: 'Scotiabank Arena', address: '40 Bay Street, Toronto, ON M5J 2X2', city: 'Toronto' },
                location: 'Toronto, ON',
                description: `${title} at Scotiabank Arena.`,
                category: category,
                image: event.image || null,
                source: 'Scotiabank Arena',
                city: 'Toronto'
              });
            }
          }
        });
        
      } catch (browserError) {
        console.log('Browser error:', browserError.message);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
      
      console.log(`\n✅ Found ${events.length} Scotiabank Arena events`);
      return filterEvents(events);
      
    } catch (error) {
      console.error('Error scraping Scotiabank Arena:', error.message);
      return [];
    }
  }
};

module.exports = ScotiabankArenaEvents.scrape;
