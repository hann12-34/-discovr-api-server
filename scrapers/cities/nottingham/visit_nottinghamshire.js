/**
 * Visit Nottinghamshire Events Scraper
 * URL: https://www.visit-nottinghamshire.co.uk/whats-on
 * Official Nottingham tourism events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeVisitNottinghamshire(city = 'Nottingham') {
  console.log('🏙️ Scraping Visit Nottinghamshire Events...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.visit-nottinghamshire.co.uk/whats-on', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/whats-on/"], a[href*="/event"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.endsWith('/whats-on') && !href.endsWith('/whats-on/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.visit-nottinghamshire.co.uk${href}`;
          if (!links.includes(fullUrl)) links.push(fullUrl);
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

        // Skip events with bad/generic addresses per rules
        const badAddressPatterns = ['view map', 'location', 'nottingham, uk', 'various', 'tba'];
        const locationLower = (eventData.location || '').toLowerCase();
        if (!eventData.location || eventData.location.length < 10 || 
            badAddressPatterns.some(p => locationLower.includes(p))) {
          continue;
        }

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: {
            name: eventData.location.split(',')[0].trim(),
            address: eventData.location,
            city: 'Nottingham'
          },
          latitude: 52.9548,
          longitude: -1.1581,
          city: 'Nottingham',
          category: 'Festival',
          source: 'Visit Nottinghamshire'
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

    console.log(`  ✅ Found ${unique.length} Visit Nottinghamshire events`);
    return unique;
  } catch (error) {
    console.error(`  ⚠️ Visit Nottinghamshire Events error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeVisitNottinghamshire;
