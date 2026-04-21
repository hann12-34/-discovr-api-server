/**
 * Glasgow Life Events Scraper
 * URL: https://www.glasgowlife.org.uk/whats-on
 * Official Glasgow events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeGlasgowLifeEvents(city = 'Glasgow') {
  console.log('🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scraping Glasgow Life Events...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.glasgowlife.org.uk/whats-on', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && (href.includes('/event') || href.includes('/whats-on/') || href.includes('/museums/') || href.includes('/libraries/'))) {
          const fullUrl = href.startsWith('http') ? href : `https://www.glasgowlife.org.uk${href}`;
          if (!links.includes(fullUrl) && !fullUrl.endsWith('/whats-on') && !fullUrl.endsWith('/whats-on/')) {
            links.push(fullUrl);
          }
        }
      });
      return links;
    });

    console.log(`  Found ${eventLinks.length} event links`);

    const events = [];
    const months = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    };

    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

        const eventData = await page.evaluate(() => {
          const titleEl = document.querySelector('h1, .event-title');
          const title = titleEl ? titleEl.textContent.trim() : null;
          const bodyText = document.body.innerText;
          const ogImage = document.querySelector('meta[property="og:image"]');
          const imageUrl = ogImage ? ogImage.getAttribute('content') : null;
          const descEl = document.querySelector('meta[property="og:description"]');
          const description = descEl ? descEl.getAttribute('content') : null;
          const locationEl = document.querySelector('[class*="location"], [class*="venue"]');
          const location = locationEl ? locationEl.textContent.trim() : null;
          return { title, bodyText, imageUrl, description, location };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        let isoDate = null;
        const currentYear = new Date().getFullYear();
        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            const day = match[1].padStart(2, '0');
            const month = months[match[2].toLowerCase()];
            const year = match[3] || currentYear.toString();
            if (month) isoDate = `${year}-${month}-${day}`;
            break;
          }
        }

        if (!isoDate) continue;
        const eventDate = new Date(isoDate);
        if (eventDate < new Date()) continue;

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: {
            name: eventData.location ? eventData.location.split(',')[0].trim() : 'Glasgow',
            address: eventData.location || 'Glasgow, Scotland, UK',
            city: 'Glasgow'
          },
          latitude: 55.8642,
          longitude: -4.2518,
          city: 'Glasgow',
          category: 'Festival',
          source: 'Glasgow Life'
        });
      } catch (e) {}
    }

    await browser.close();

    const unique = [];
    const seen = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!seen.has(key)) { seen.add(key); unique.push(e); }
    }

    console.log(`  ✅ Found ${unique.length} Glasgow Life events`);
    return unique;
  } catch (error) {
    console.error(`  ⚠️ Glasgow Life Events error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeGlasgowLifeEvents;
