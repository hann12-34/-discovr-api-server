/**
 * Saddledome Calgary Scraper with Puppeteer
 * Fetches real images from Ticketmaster (requires JS rendering)
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function scrape(city = 'Calgary') {
  console.log('🏟️ Scraping Saddledome events (Puppeteer)...');
  let browser;

  try {
    // First get event list from Saddledome
    const listResponse = await axios.get('https://www.scotiabanksaddledome.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    const $ = cheerio.load(listResponse.data);
    const ticketmasterUrls = [];
    
    $('a[href*="ticketmaster.ca/"][href*="/event/"]').each((i, el) => {
      const url = $(el).attr('href');
      if (url && !ticketmasterUrls.includes(url)) {
        ticketmasterUrls.push(url);
      }
    });

    console.log(`   Found ${ticketmasterUrls.length} Ticketmaster URLs`);
    
    if (ticketmasterUrls.length === 0) {
      return [];
    }

    // Use Puppeteer to fetch images from Ticketmaster
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const events = [];
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Process URLs in batches
    const urlsToProcess = ticketmasterUrls.slice(0, 40); // Limit to avoid rate limiting
    
    for (const url of urlsToProcess) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const eventData = await page.evaluate(() => {
          const title = document.querySelector('h1, [class*="event-name"], [class*="title"]')?.textContent?.trim() || '';
          const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
          const dateEl = document.querySelector('[class*="date"], time');
          const dateText = dateEl?.textContent?.trim() || '';
          
          return { title, ogImage, dateText };
        });

        if (eventData.title && eventData.title.length > 5) {
          // Parse date
          let eventDate = null;
          const dateMatch = url.match(/(\d{2})-(\d{2})-(\d{4})/);
          if (dateMatch) {
            eventDate = `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`;
          }

          // Skip past events
          if (eventDate && new Date(eventDate) < new Date()) continue;

          events.push({
            id: uuidv4(),
            title: eventData.title.split('\n')[0].substring(0, 100),
            date: eventDate,
            url: url,
            image: eventData.ogImage || null,
            imageUrl: eventData.ogImage || null,
            venue: {
              name: 'Scotiabank Saddledome',
              address: '555 Saddledome Rise SE, Calgary, AB T2G 2W1',
              city: 'Calgary'
            },
            city: 'Calgary',
            category: 'Sports & Entertainment',
            source: 'Saddledome'
          });
        }
      } catch (e) {
        // Skip failed URLs
      }
    }

    await browser.close();

    const withImages = events.filter(e => e.image).length;
    console.log(`✅ Saddledome Puppeteer: ${events.length} events, ${withImages} with images`);
    return events;

  } catch (error) {
    console.error('  ⚠️ Saddledome Puppeteer error:', error.message);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrape;
