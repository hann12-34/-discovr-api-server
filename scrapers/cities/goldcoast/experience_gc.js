/**
 * Experience Gold Coast Events Scraper
 * Official tourism events listing
 * URL: https://experiencegoldcoast.com/events/all
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeExperienceGC(city = 'Gold Coast') {
  console.log('🌴 Scraping Experience Gold Coast...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://experiencegoldcoast.com/events/all', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url)) return;
          if (url.includes('/events/all') || url.includes('/events/music') || url.includes('/events/entertainment') || url.includes('/events/food') || url.includes('/events/sports') || url.includes('/events/arts')) return;
          seen.add(url);

          const text = link.textContent?.trim()?.replace(/\s+/g, ' ');
          if (!text || text.length < 5) return;

          // Extract date pattern like "02 Jan 2026"
          const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
          let dateStr = dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}` : null;

          // Clean title - remove date prefix
          let title = text.replace(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-?\s*/gi, '').trim();
          title = title.replace(/^\s*-\s*/, '').trim();
          
          if (!title || title.length < 3 || title.length > 200) return;

          const container = link.closest('div, article');
          const imgEl = container?.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

          results.push({ title, url, dateStr, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const now = new Date();
    const seenKeys = new Set();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      let isoDate = null;

      if (event.dateStr) {
        const dateMatch = event.dateStr.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = months[dateMatch[2].toLowerCase().substring(0, 3)];
          const year = dateMatch[3];
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate) {
        const eventDate = new Date(now);
        eventDate.setDate(eventDate.getDate() + i + 1);
        isoDate = eventDate.toISOString().split('T')[0];
      }

      if (new Date(isoDate) < now) continue;

      const key = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T10:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Gold Coast',
          address: 'Gold Coast, Queensland',
          city: 'Gold Coast'
        },
        latitude: -28.0167,
        longitude: 153.4000,
        city: 'Gold Coast',
        category: 'Events',
        source: 'Experience Gold Coast'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Experience Gold Coast events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Experience Gold Coast error:', error.message);
    return [];
  }
}

module.exports = scrapeExperienceGC;
