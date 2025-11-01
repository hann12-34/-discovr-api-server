/**
 * Rogers Arena Events Scraper
 * Scrapes upcoming events from Rogers Arena official website
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RogersArenaEvents = {
  async scrape(city) {
    console.log('🏒 Scraping Rogers Arena events (Canucks + Concerts)...');
    
    try {
      const events = [];
      const seen = new Set();
      
      // 1. Get Canucks schedule from NHL API
      console.log('Fetching Canucks games...');
      try {
        const nhlResponse = await axios.get('https://api-web.nhle.com/v1/club-schedule-season/van/now', {
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
            
            // Only include home games at Rogers Arena
            if (homeTeam === 'Vancouver' && gameDate) {
              const title = `Vancouver Canucks vs ${awayTeam}`;
              
              if (!seen.has(gameDate + title)) {
                seen.add(gameDate + title);
                
                console.log(`✓ ${title} | ${gameDate}`);
                
                events.push({
                  id: uuidv4(),
                  title: title,
                  date: gameDate,
                  time: game.startTimeUTC || null,
                  url: `https://www.nhl.com/canucks/schedule`,
                  venue: { name: 'Rogers Arena', address: '800 Griffiths Way, Vancouver, BC V6B 6G1', city: 'Vancouver' },
                  location: 'Vancouver, BC',
                  description: `${title} at Rogers Arena, home of the Vancouver Canucks.`,
                  category: 'Sports',
                  image: null,
                  source: 'Rogers Arena',
                  city: 'Vancouver'
                });
              }
            }
          });
        }
      } catch (nhlError) {
        console.log('NHL API error:', nhlError.message);
      }
      
      // 2. Get concerts and other events from Rogers Arena website using Puppeteer
      console.log('Fetching concerts with headless browser...');
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Loading Rogers Arena concerts page...');
        await page.goto('https://rogersarena.com/events/?tribe_eventcategory%5B0%5D=13', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait for events to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract JSON-LD data
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
        
        console.log(`Found ${eventData.length} events from Rogers Arena website`);
        
        eventData.forEach(event => {
          if (event.name) {
            const title = event.name
              .replace(/&#8211;/g, '–')
              .replace(/&amp;/g, '&')
              .replace(/&#8217;/g, "'")
              .replace(/&#038;/g, '&');
            
            // Skip Canucks games (already got from NHL API)
            if (title.toLowerCase().includes('canucks')) {
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
              
              // Determine category
              let category = 'Concert';
              if (title.toLowerCase().includes('ufc') || title.toLowerCase().includes('fight')) {
                category = 'Sports';
              }
              
              console.log(`✓ ${title} | ${eventDate}`);
              
              events.push({
                id: uuidv4(),
                title: title,
                date: eventDate,
                time: null,
                url: event.url || 'https://rogersarena.com/events/',
                venue: { name: 'Rogers Arena', address: '800 Griffiths Way, Vancouver, BC V6B 6G1', city: 'Vancouver' },
                location: 'Vancouver, BC',
                description: `${title} at Rogers Arena.`,
                category: category,
                image: event.image || null,
                source: 'Rogers Arena',
                city: 'Vancouver'
              });
            }
          }
        });
        
      } catch (raError) {
        console.log('Rogers Arena browser error:', raError.message);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
      
      console.log(`\n✅ Found ${events.length} Rogers Arena events (Canucks + Concerts)`);
      return filterEvents(events);
      
    } catch (error) {
      console.error('Error scraping Rogers Arena:', error.message);
      return [];
    }
  }
};

module.exports = RogersArenaEvents.scrape;
