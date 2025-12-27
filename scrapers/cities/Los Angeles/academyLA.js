/**
 * Academy LA Scraper
 * Popular electronic music venue in Hollywood
 * URL: https://academy.la/events/
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeAcademyLA(city = 'Los Angeles') {
  console.log('🎭 Scraping Academy LA...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://academy.la/events/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event links with dates
      const links = document.querySelectorAll('a[href*="/event/"]');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const title = link.textContent.trim().replace(/\s+/g, ' ');
        
        // Skip navigation/ticket links
        if (!title || title.length < 3 || /tickets|tables/i.test(title)) return;
        
        // Look for date in parent container
        let parent = link.parentElement;
        let dateText = '';
        for (let i = 0; i < 5 && parent; i++) {
          const text = parent.textContent || '';
          const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2})/);
          if (dateMatch) {
            dateText = dateMatch[0];
            break;
          }
          parent = parent.parentElement;
        }
        
        if (dateText && title.length > 2) {
          const parts = dateText.split('.');
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = '20' + parts[2];
          const date = `${year}-${month}-${day}`;
          
          const key = title.substring(0, 50) + date;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              title: title.substring(0, 100),
              date,
              url: href.startsWith('http') ? href : 'https://academy.la' + href
            });
          }
        }
      });
      
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Academy LA events`);

    // Fetch images from event pages
    const formattedEvents = [];
    for (const event of events) {
      let imageUrl = null;
      
      try {
        const res = await axios.get(event.url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        });
        const $ = cheerio.load(res.data);
        imageUrl = $('meta[property="og:image"]').attr('content');
      } catch (e) {}
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        date: event.date,
        startDate: event.date ? new Date(event.date + 'T22:00:00') : null,
        url: event.url,
        imageUrl,
        venue: {
          name: 'Academy LA',
          address: '6021 Hollywood Blvd, Los Angeles, CA 90028',
          city: 'Los Angeles'
        },
        latitude: 34.1018,
        longitude: -118.3196,
        city: 'Los Angeles',
        category: 'Nightlife',
        source: 'AcademyLA'
      });
      
      console.log(`  ✓ ${event.title} | ${event.date}`);
    }
    
    return filterEvents(formattedEvents);

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Academy LA error:', error.message);
    return [];
  }
}

module.exports = scrapeAcademyLA;
