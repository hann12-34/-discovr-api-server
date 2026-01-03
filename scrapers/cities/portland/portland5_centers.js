/**
 * Portland'5 Centers for the Arts Scraper
 * Multiple venues: Keller Auditorium, Arlene Schnitzer, Newmark Theatre, etc.
 * URL: https://www.portland5.com/events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapePortland5(city = 'Portland') {
  console.log('🎭 Scraping Portland5 Centers...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://www.portland5.com/events', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      document.querySelectorAll('a[href*="/events/"], .event-item, .event-card, article').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/events/"]');
          const url = linkEl?.href;
          if (!url || seen.has(url) || !url.includes('/events/')) return;
          seen.add(url);

          let container = el;
          for (let i = 0; i < 5 && container; i++) {
            container = container.parentElement;
          }
          if (!container) container = el;

          const title = el.querySelector('h2, h3, h4, .title, .event-title')?.textContent?.trim() ||
                       linkEl?.textContent?.trim();
          if (!title || title.length < 3 || title.length > 150) return;

          const dateEl = el.querySelector('time, .date, [class*="date"]');
          const dateText = dateEl?.getAttribute('datetime') || dateEl?.textContent || container?.textContent || '';
          
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i) ||
                           dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);

          const venueEl = el.querySelector('.venue, .location, [class*="venue"]');
          let venueName = venueEl?.textContent?.trim() || 'Portland5 Center';
          
          if (container?.textContent?.includes('Keller')) venueName = 'Keller Auditorium';
          else if (container?.textContent?.includes('Schnitzer')) venueName = 'Arlene Schnitzer Concert Hall';
          else if (container?.textContent?.includes('Newmark')) venueName = 'Newmark Theatre';

          const img = el.querySelector('img');
          const imageUrl = img?.src && !img.src.includes('data:') ? img.src : null;

          results.push({
            title,
            url,
            dateText: dateMatch ? dateMatch[0] : null,
            venueName,
            imageUrl
          });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const now = new Date();

    const venueAddresses = {
      'Keller Auditorium': '222 SW Clay St, Portland, OR 97201',
      'Arlene Schnitzer Concert Hall': '1037 SW Broadway, Portland, OR 97205',
      'Newmark Theatre': '1111 SW Broadway, Portland, OR 97205',
      'Portland5 Center': '1111 SW Broadway, Portland, OR 97205'
    };

    for (const event of events) {
      let isoDate = null;

      if (event.dateText) {
        const monthMatch = event.dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (monthMatch) {
          const month = months[monthMatch[1].toLowerCase()];
          const day = monthMatch[2].padStart(2, '0');
          let year = monthMatch[3] || now.getFullYear().toString();
          if (!monthMatch[3] && parseInt(month) < now.getMonth() + 1) {
            year = (now.getFullYear() + 1).toString();
          }
          isoDate = `${year}-${month}-${day}`;
        }
      }

      if (!isoDate || new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:30:00'),
        url: event.url,
        imageUrl: event.imageUrl,
        venue: {
          name: event.venueName,
          address: venueAddresses[event.venueName] || '1111 SW Broadway, Portland, OR 97205',
          city: 'Portland'
        },
        city: 'Portland',
        category: 'Nightlife',
        source: 'Portland5'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Portland5 events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ Portland5 error: ${error.message}`);
    return [];
  }
}

module.exports = scrapePortland5;
