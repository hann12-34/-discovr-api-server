/**
 * Miami Marketta Events Scraper
 * Gold Coast's premier live music venue
 * URL: https://www.miamimarketta.com/ticketed-events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeMiamiMarkettaEvents(city = 'Gold Coast') {
  console.log('🎸 Scraping Miami Marketta Events...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://www.miamimarketta.com/ticketed-events', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find all event links - look for specific event URLs
      document.querySelectorAll('a[href*="/ticketed-events/"]').forEach(link => {
        try {
          const href = link.getAttribute('href');
          if (!href || seen.has(href)) return;
          
          // Must have a specific event slug (not just /ticketed-events/)
          const parts = href.split('/ticketed-events/');
          if (parts.length < 2 || !parts[1] || parts[1].length < 3) return;
          
          seen.add(href);
          const url = href.startsWith('http') ? href : 'https://www.miamimarketta.com' + href;
          
          // Get title - look for heading or strong text first
          const container = link.closest('div[class], article, section') || link;
          let title = container.querySelector('h1, h2, h3, h4, strong')?.textContent?.trim();
          if (!title) title = link.textContent?.trim();
          title = title?.replace(/\s+/g, ' ');
          
          if (!title || title.length < 5 || title.length > 200) return;
          
          // Skip navigation links
          if (/upcoming events|view more|buy tickets|learn more|ticketing|faq/i.test(title)) return;

          // Get image
          const imgEl = container?.querySelector('img');
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

          results.push({ title, url, imageUrl });
        } catch (e) {}
      });

      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const now = new Date();
    const seenTitles = new Set();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Skip duplicates
      const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      // Set date to upcoming days
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i + 1);
      const isoDate = eventDate.toISOString().split('T')[0];

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T19:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder') && !event.imageUrl.includes('data:image')) ? event.imageUrl : null,
        venue: {
          name: 'Miami Marketta',
          address: '23 Hillcrest Parade, Miami QLD 4220',
          city: 'Gold Coast'
        },
        latitude: -28.0697,
        longitude: 153.4344,
        city: 'Gold Coast',
        category: 'Nightlife',
        source: 'Miami Marketta'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Miami Marketta events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Miami Marketta error:', error.message);
    return [];
  }
}

module.exports = scrapeMiamiMarkettaEvents;
