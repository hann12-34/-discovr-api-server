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
                
                // Get team logo from NHL API
                const teamLogo = game.homeTeam?.logo || 'https://assets.nhle.com/logos/nhl/svg/VAN_light.svg';
                
                
          // COMPREHENSIVE DATE EXTRACTION - Works with most event websites
          let dateText = null;
          
          // Try multiple strategies to find the date
          const dateSelectors = [
            'time[datetime]',
            '[datetime]',
            '.date',
            '.event-date', 
            '.show-date',
            '[class*="date"]',
            'time',
            '.datetime',
            '.when',
            '[itemprop="startDate"]',
            '[data-date]',
            '.day',
            '.event-time',
            '.schedule',
            'meta[property="event:start_time"]'
          ];
          
          // Strategy 1: Look in the event element itself
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length > 0 && dateText.length < 100) {
                console.log(`✓ Found date with ${selector}: ${dateText}`);
                break;
              }
            }
          }
          
          // Strategy 2: Check parent containers if not found
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"], .card, .listing');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
                  if (dateText && dateText.length > 0 && dateText.length < 100) {
                    console.log(`✓ Found date in parent with ${selector}: ${dateText}`);
                    break;
                  }
                }
              }
            }
          }
          
          // Strategy 3: Look for common date patterns in nearby text
          if (!dateText) {
            const nearbyText = $element.parent().text();
            // Match patterns like "Nov 4", "November 4", "11/04/2025", etc.
            const datePatterns = [
              /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(,?\s+\d{4})?/i,
              /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
              /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i
            ];
            
            for (const pattern of datePatterns) {
              const match = nearbyText.match(pattern);
              if (match) {
                dateText = match[0].trim();
                console.log(`✓ Found date via pattern matching: ${dateText}`);
                break;
              }
            }
          }
          
          // Clean up the date text
          if (dateText) {
            dateText = dateText
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
              .replace(/\d{1,2}:\d{2}\s*(AM|PM)\d{1,2}:\d{2}/gi, '')
              .trim();
            // Remove common prefixes
            dateText = dateText.replace(/^(Date:|When:|Time:)\s*/i, '');
            
            if (dateText && !/\d{4}/.test(dateText)) {
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();
              const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const dateLower = dateText.toLowerCase();
              const monthIndex = months.findIndex(m => dateLower.includes(m));
              if (monthIndex !== -1) {
                const year = monthIndex < currentMonth ? currentYear + 1 : currentYear;
                dateText = `${dateText}, ${year}`;
              } else {
                dateText = `${dateText}, ${currentYear}`;
              }
            }
            // Validate it's not garbage
            if (dateText.length < 5 || dateText.length > 100) {
              console.log(`⚠️  Invalid date text (too short/long): ${dateText}`);
              dateText = null;
            }
          }

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
                  image: teamLogo,
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
        
        // Process events and fetch missing images
        for (const event of eventData) {
          if (event.name) {
            const title = event.name
              .replace(/&#8211;/g, '–')
              .replace(/&amp;/g, '&')
              .replace(/&#8217;/g, "'")
              .replace(/&#038;/g, '&');
            
            // Skip Canucks games (already got from NHL API)
            if (title.toLowerCase().includes('canucks')) {
              continue;
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
              
              // Get image from JSON-LD or fetch from event page
              let eventImage = event.image || null;
              if (!eventImage && event.url) {
                try {
                  await page.goto(event.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
                  await new Promise(r => setTimeout(r, 1500));
                  eventImage = await page.evaluate(() => {
                    const og = document.querySelector('meta[property="og:image"]');
                    return og?.content || null;
                  });
                } catch (e) {}
              }
              
              console.log(`✓ ${title} | ${eventDate} | ${eventImage ? 'IMG' : 'no img'}`);
              
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
                image: eventImage,
                source: 'Rogers Arena',
                city: 'Vancouver'
              });
            }
          }
        }
        
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
