/**
 * Bournemouth Pavilion Events Scraper
 * URL: https://www.bournemouthpavilion.co.uk/whats-on/
 * Official Bournemouth Pavilion Theatre events
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeBournemouthPavilion(city = 'Bournemouth') {
  console.log('🎭 Scraping Bournemouth Pavilion...');
  let browser;

  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    await page.goto('https://www.bournemouthpavilion.co.uk/whats-on/', { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const eventLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href*="/whats-on/"], a[href*="/event/"]');
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.endsWith('/whats-on/') && !href.endsWith('/whats-on')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.bournemouthpavilion.co.uk${href}`;
          if (!links.includes(fullUrl)) {
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
      'september': '09', 'october': '10', 'november': '11', 'december': '12',
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dec': '12'
    };

    for (const url of eventLinks) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        await delay(1000);

        const eventData = await page.evaluate(() => {
          const titleEl = document.querySelector('h1, .event-title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : null;

          const bodyText = document.body.innerText;

          const ogImage = document.querySelector('meta[property="og:image"]');
          let imageUrl = ogImage ? ogImage.getAttribute('content') : null;
          
          if (!imageUrl) {
            const imgs = document.querySelectorAll('img[src*="pavilion"], img[class*="featured"], img[class*="hero"]');
            for (const img of imgs) {
              const src = img.getAttribute('src');
              if (src && !src.includes('logo') && !src.includes('icon')) {
                imageUrl = src.startsWith('http') ? src : `https://www.bournemouthpavilion.co.uk${src}`;
                break;
              }
            }
          }

          const descEl = document.querySelector('meta[property="og:description"], meta[name="description"]');
          const description = descEl ? descEl.getAttribute('content') : null;

          return { title, bodyText, imageUrl, description };
        });

        if (!eventData.title || eventData.title.length < 3) continue;

        let isoDate = null;
        const currentYear = new Date().getFullYear();

        const datePatterns = [
          /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i,
          /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s*(\d{4})?/i,
          /(\d{4})-(\d{2})-(\d{2})/
        ];

        for (const pattern of datePatterns) {
          const match = eventData.bodyText.match(pattern);
          if (match) {
            if (match[0].includes('-') && match[1].length === 4) {
              isoDate = match[0];
            } else if (!isNaN(parseInt(match[1]))) {
              const day = match[1].padStart(2, '0');
              const month = months[match[2].toLowerCase()];
              const year = match[3] || currentYear.toString();
              if (month) isoDate = `${year}-${month}-${day}`;
            } else {
              const month = months[match[1].toLowerCase()];
              const day = match[2].padStart(2, '0');
              const year = match[3] || currentYear.toString();
              if (month) isoDate = `${year}-${month}-${day}`;
            }
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
            name: 'Bournemouth Pavilion',
            address: 'Westover Road, Bournemouth BH1 2BU, United Kingdom',
            city: 'Bournemouth'
          },
          latitude: 50.7167,
          longitude: -1.8833,
          city: 'Bournemouth',
          category: 'Music',
          source: 'Bournemouth Pavilion'
        });

      } catch (e) {
        // Skip failed events
      }
    }

    await browser.close();

    const unique = [];
    const seen = new Set();
    for (const e of events) {
      const key = `${e.title}|${e.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(e);
      }
    }

    console.log(`  ✅ Found ${unique.length} Bournemouth Pavilion events`);
    return unique;

  } catch (error) {
    console.error(`  ⚠️ Bournemouth Pavilion error: ${error.message}`);
    if (browser) await browser.close();
    return [];
  }
}

module.exports = scrapeBournemouthPavilion;
