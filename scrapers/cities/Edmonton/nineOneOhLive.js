/**
 * 910 Live Edmonton Events Scraper
 * Concert venue
 * URL: https://910live.ca
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

async function scrape910Live(city = 'Edmonton') {
  console.log('🎤 Scraping 910 Live Edmonton...');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto('https://910live.ca/events/', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      document.querySelectorAll('a[href*="event"], .event-card, article, .show').forEach(el => {
        try {
          const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
          const url = linkEl?.href;
          if (!url || seen.has(url)) return;
          seen.add(url);

          const title = el.querySelector('h2, h3, h4, .title')?.textContent.trim() || linkEl?.textContent.trim();
          if (!title || title.length < 3) return;

          const dateText = el.textContent || '';
          const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
          
          const img = el.querySelector('img');
          const imageUrl = img?.src || null;

          results.push({ 
            title, 
            url, 
            dateStr: dateMatch ? `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3] || '2025'}` : null,
            imageUrl 
          });
        } catch (e) {}
      });
      
      return results;
    });

    await browser.close();

    const formattedEvents = [];
    const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    for (const event of events) {
      if (!event.dateStr) continue;
      
      const dateMatch = event.dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s+(\d{4})/i);
      if (!dateMatch) continue;

      const month = months[dateMatch[1].toLowerCase()];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const isoDate = `${year}-${month}-${day}`;

      if (new Date(isoDate) < new Date()) continue;

      formattedEvents.push({
        id: uuidv4(),
        title: event.title,
        description: 'Live at 910 Live Edmonton',
        date: isoDate,
        startDate: new Date(isoDate + 'T20:00:00'),
        url: event.url,
        imageUrl: (event.imageUrl && event.imageUrl.startsWith('http') && !event.imageUrl.includes('data:image') && !event.imageUrl.includes('placeholder')) ? event.imageUrl : null,
        venue: {
          name: '910 Live',
          address: '910 Rice Howard Way NW, Edmonton, AB T5J 0P6',
          city: 'Edmonton'
        },
        latitude: 53.5438,
        longitude: -113.4880,
        city: 'Edmonton',
        category: 'Nightlife',
        source: '910 Live'
      });
    }

    console.log(`  ✅ Found ${formattedEvents.length} 910 Live events`);
    return formattedEvents;

  } catch (error) {
    if (browser) await browser.close();
    console.error(`  ⚠️ 910 Live error: ${error.message}`);
    return [];
  }
}

module.exports = scrape910Live;
