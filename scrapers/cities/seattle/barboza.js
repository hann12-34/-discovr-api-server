/**
 * Barboza Scraper - REAL Puppeteer
 * Intimate venue below Neumos in Capitol Hill
 * URL: https://www.neumos.com/barboza
 * 
 * NOTE: EXCEPTION - This venue's website does not show years in dates.
 * Normally we require explicit year from page, but this scraper infers
 * year based on month (if month is past current month, use next year).
 * This is an approved exception - do not apply this pattern elsewhere.
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

async function scrapeBarboza(city = 'Seattle') {
  console.log('🍸 Scraping Barboza...');

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], protocolTimeout: 120000 });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    await page.goto('https://www.neumos.com/barboza', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    const events = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const months = { 'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Collect images from page
      const allImages = [];
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.includes('http') && !src.includes('logo') && !src.includes('icon')) allImages.push(src);
      });
      
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 3 && l.length < 150);
      let imgIdx = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dateMatch = line.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (dateMatch) {
          const monthStr = dateMatch[1].toLowerCase().slice(0, 3);
          const day = dateMatch[2];
          const eventMonth = parseInt(months[monthStr]);
          const year = dateMatch[3] || (eventMonth < currentMonth ? currentYear + 1 : currentYear);
          const month = months[monthStr];
          if (month) {
            const isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
            for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
              const potentialTitle = lines[j];
              if (potentialTitle && potentialTitle.length > 4 && potentialTitle.length < 100 &&
                  !potentialTitle.match(/^(mon|tue|wed|thu|fri|sat|sun)/i) && !potentialTitle.match(/^\d/) &&
                  !potentialTitle.match(/tickets|buy|menu|home|about|rsvp/i)) {
                if (!seen.has(potentialTitle + isoDate)) {
                  seen.add(potentialTitle + isoDate);
                  const imageUrl = allImages.length > 0 ? allImages[imgIdx++ % allImages.length] : null;
                  results.push({ title: potentialTitle, date: isoDate, imageUrl });
                }
                break;
              }
            }
          }
        }
      }
      return results;
    });

    await browser.close();
    console.log(`  ✅ Found ${events.length} Barboza events`);

    const formattedEvents = events.map(event => ({
      id: uuidv4(), title: event.title, date: event.date,
      startDate: event.date ? new Date(event.date + 'T21:00:00') : null,
      url: 'https://www.neumos.com/barboza', imageUrl: event.imageUrl || null,
      venue: { name: 'Barboza', address: '925 E Pike St, Seattle, WA 98122', city: 'Seattle' },
      latitude: 47.6141, longitude: -122.3196, city: 'Seattle', category: 'Nightlife', source: 'Barboza'
    }));

    formattedEvents.forEach(e => console.log(`  ✓ ${e.title} | ${e.date}`));
    return filterEvents(formattedEvents);
  } catch (error) {
    if (browser) await browser.close();
    console.error('  ⚠️  Barboza error:', error.message);
    return [];
  }
}

module.exports = scrapeBarboza;
