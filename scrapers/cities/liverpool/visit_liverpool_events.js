/**
 * Visit Liverpool Events Scraper
 * URL: https://www.visitliverpool.com/whats-on-in-liverpool/
 * Official Liverpool tourism events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeVisitLiverpoolEvents(city = 'Liverpool') {
  console.log('🏙️ Scraping Visit Liverpool Events...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.visitliverpool.com/whats-on-in-liverpool/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && (href.includes('/whats-on/') || href.includes('/event'))) {
          const fullUrl = href.startsWith('http') ? href : `https://www.visitliverpool.com${href}`;
          if (!links.includes(fullUrl) && !fullUrl.endsWith('/whats-on-in-liverpool/')) links.push(fullUrl);
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
        const match = eventData.bodyText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i);
        if (match) {
          const day = match[1].padStart(2, '0');
          const month = months[match[2].toLowerCase()];
          let year = match[3]; if (!year) { year = (parseInt(month) < new Date().getMonth() + 1) ? String(currentYear + 1) : String(currentYear); }
          if (month) isoDate = `${year}-${month}-${day}`;
        }

        if (!isoDate) continue;
        const eventDate = new Date(isoDate);
        if (eventDate < new Date()) continue;

        events.push({
          id: uuidv4(),
          title: eventData.title,
          date: isoDate,
          startDate: new Date(isoDate + 'T00:00:00.000Z'),
          url: url,
          imageUrl: eventData.imageUrl || null,
          description: eventData.description || null,
          venue: {
            name: eventData.location ? eventData.location.split(',')[0].trim() : 'Liverpool',
            address: eventData.location || 'Liverpool, UK',
            city: 'Liverpool'
          },
          latitude: 53.4084,
          longitude: -2.9916,
          city: 'Liverpool',
          category: 'Festival',
          source: 'Visit Liverpool'
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
    console.log(`  ✅ Found ${unique.length} Visit Liverpool events`);
    return unique;
  } catch (error) {
    console.error(`  ⚠️ Visit Liverpool Events error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeVisitLiverpoolEvents;
