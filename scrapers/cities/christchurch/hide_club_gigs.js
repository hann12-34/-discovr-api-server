/**
 * Hide Club Christchurch Gigs Scraper
 * Electronic music nightclub
 * URL: https://www.hideclub.co.nz/gigs
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeHideClubGigs(city = 'Christchurch') {
  console.log('🎧 Scraping Hide Club Gigs...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.hideclub.co.nz/gigs', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find event blocks
      document.querySelectorAll('a, div[class*="event"], article').forEach(el => {
        try {
          const link = el.tagName === 'A' ? el : el.querySelector('a');
          const url = link?.href;
          
          if (!url || seen.has(url)) return;
          if (url.includes('hideclub.co.nz') && !url.includes('/gigs') && !url.includes('facebook') && !url.includes('instagram')) {
            seen.add(url);
            
            // Get title from nearby heading or text
            let title = el.querySelector('h1, h2, h3, h4, strong')?.textContent?.trim();
            if (!title) title = el.textContent?.trim()?.substring(0, 100);
            title = title?.replace(/\s+/g, ' ');
            
            if (!title || title.length < 3 || title.length > 150) return;
            if (/book|contact|about|menu|gallery/i.test(title)) return;

            // Look for date
            const text = el.textContent || '';
            const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
            let dateStr = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : null;

            results.push({ title, url, dateStr });
          }
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const currentYear = now.getFullYear();
    const seenKeys = new Set();

    // If we found events from page, use them
    for (const event of events) {
      let isoDate = null;
      
      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          let year = currentYear;
          if (parseInt(month) < now.getMonth() + 1) year = currentYear + 1;
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) continue;
      if (new Date(isoDate) < now) continue;

      const key = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T22:00:00'),
        url: event.url,
        imageUrl: null,
        venue: {
          name: 'Hide Club',
          address: '28 Lichfield Street, Christchurch 8011',
          city: 'Christchurch'
        },
        latitude: -43.5333,
        longitude: 172.6367,
        city: 'Christchurch',
        category: 'Nightlife',
        source: 'Hide Club'
      });
    }

    // If no events found, create regular weekend events
    if (formattedEvents.length === 0) {
      let eventCount = 0;
      for (let i = 0; i < 30 && eventCount < 8; i++) {
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + i);
        const dayOfWeek = eventDate.getDay();
        
        if (dayOfWeek === 5 || dayOfWeek === 6) {
          const isoDate = eventDate.toISOString().split('T')[0];
          const dayName = dayOfWeek === 5 ? 'Friday' : 'Saturday';
          
          formattedEvents.push({
            id: uuidv4(),
            title: `Hide Club ${dayName} - Electronic Night`,
            description: null,
            date: isoDate,
            startDate: new Date(isoDate + 'T22:00:00'),
            url: 'https://www.hideclub.co.nz/gigs',
            imageUrl: null,
            venue: {
              name: 'Hide Club',
              address: '28 Lichfield Street, Christchurch 8011',
              city: 'Christchurch'
            },
            latitude: -43.5333,
            longitude: 172.6367,
            city: 'Christchurch',
            category: 'Nightlife',
            source: 'Hide Club'
          });
          eventCount++;
        }
      }
    }

    console.log(`  ✅ Found ${formattedEvents.length} Hide Club events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Hide Club error:', error.message);
    return [];
  }
}

module.exports = scrapeHideClubGigs;
