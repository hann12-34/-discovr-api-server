/**
 * Avant Gardner / Brooklyn Mirage Events Scraper
 * Major Brooklyn nightclub and event space
 * URL: https://www.avant-gardner.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeAvantGardner(city = 'New York') {
  console.log('🎪 Scraping Avant Gardner...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.avant-gardner.com/events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Scroll to load more events
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // Find all event links - URLs have format /events/2025/12/29/event-name
      document.querySelectorAll('a[href*="/events/20"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url) || url.includes('?format=ical')) return;
          seen.add(url);
          
          // Extract date from URL: /events/2025/12/29/zedd
          const dateMatch = url.match(/\/events\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
          if (!dateMatch) return;
          
          const year = dateMatch[1];
          const month = dateMatch[2].padStart(2, '0');
          const day = dateMatch[3].padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // Get title from link text or parent
          let title = link.textContent?.trim();
          if (!title || title.length < 3 || title === 'View Event →') {
            const parent = link.closest('article, section, div');
            const h1 = parent?.querySelector('h1, h2, h3');
            title = h1?.textContent?.trim();
          }
          
          // Clean title - remove "- SOLD OUT" suffix for cleaner display but keep it for uniqueness check
          const cleanTitle = title?.replace(/\s*-\s*SOLD OUT$/i, '').trim();
          if (!cleanTitle || cleanTitle.length < 3) return;
          
          // Get venue from page text
          const parent = link.closest('article, section, div');
          const text = parent?.textContent || '';
          let venueName = 'Avant Gardner';
          let address = '140 Stewart Ave, Brooklyn, NY 11237';
          
          if (text.includes('Brooklyn Mirage')) {
            venueName = 'Brooklyn Mirage';
          } else if (text.includes('Great Hall')) {
            venueName = 'The Great Hall';
          } else if (text.includes('Kings Hall')) {
            venueName = 'Kings Hall';
          } else if (text.includes('Brooklyn Paramount')) {
            venueName = 'Brooklyn Paramount';
            address = '385 Flatbush Ave Extension, Brooklyn, NY 11201';
          }
          
          // Get image
          const imgEl = parent?.querySelector('img');
          let imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');
          
          results.push({ 
            title: cleanTitle, 
            dateStr, 
            url, 
            imageUrl,
            venueName,
            address,
            soldOut: title?.includes('SOLD OUT')
          });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const seenKeys = new Set();
    
    for (const event of events) {
      if (!event.dateStr) continue;
      if (new Date(event.dateStr) < now) continue;
      
      const key = event.title + event.dateStr;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      
      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: event.soldOut ? 'SOLD OUT' : null,
        date: event.dateStr,
        startDate: new Date(event.dateStr + 'T21:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: event.venueName,
          address: event.address,
          city: 'New York'
        },
        latitude: 40.7089,
        longitude: -73.9312,
        city: 'New York',
        category: 'Nightlife',
        source: 'Avant Gardner'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Avant Gardner events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Avant Gardner error:', error.message);
    return [];
  }
}

module.exports = scrapeAvantGardner;
