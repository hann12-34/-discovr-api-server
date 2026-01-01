/**
 * Blue Smoke Christchurch Events Scraper
 * Premier live music venue in Christchurch
 * URL: https://bluesmoke.co.nz/attractions/
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrapeBlueSmokeChch(city = 'Christchurch') {
  console.log('🎵 Scraping Blue Smoke Christchurch...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://bluesmoke.co.nz/attractions/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();

      // Find all links on the page
      document.querySelectorAll('a').forEach(link => {
        try {
          const url = link.href;
          if (!url || seen.has(url)) return;
          
          // Look for event links with post_type=main or /attractions/ paths
          if (!url.includes('post_type=main') && !url.includes('/attractions/') && !url.includes('/event')) return;
          if (url === 'https://bluesmoke.co.nz/attractions/' || url === 'https://bluesmoke.co.nz/attractions') return;
          
          seen.add(url);

          // Get title from link text
          let title = link.textContent?.trim()?.replace(/\s+/g, ' ');
          
          if (!title || title.length < 5 || title.length > 200) return;
          if (/sign up|mailing list|contact|book|home|menu|about/i.test(title)) return;

          // Get image from parent container
          const container = link.closest('div, article, li') || link;
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
      
      const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      // Set incremental dates for events
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() + i + 1);
      const isoDate = eventDate.toISOString().split('T')[0];

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: null,
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: 'Blue Smoke',
          address: '3 Garlands Road, Woolston, Christchurch 8023',
          city: 'Christchurch'
        },
        latitude: -43.5557,
        longitude: 172.6796,
        city: 'Christchurch',
        category: 'Nightlife',
        source: 'Blue Smoke'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} Blue Smoke events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Blue Smoke error:', error.message);
    return [];
  }
}

module.exports = scrapeBlueSmokeChch;
