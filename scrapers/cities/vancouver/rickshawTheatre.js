/**
 * Rickshaw Theatre Events Scraper
 * Scrapes upcoming events from Rickshaw Theatre
 * Vancouver's historic live music venue
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RickshawTheatreEvents = {
  async scrape(city) {
    console.log('🎸 Scraping Rickshaw Theatre with headless browser...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      console.log('Loading Rickshaw Theatre page...');
      await page.goto('https://www.rickshawtheatre.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract event data from the page - DO NOT USE EVENTBRITE URLs (competitor!)
      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();
        
        // Find event containers - look for divs with dates and titles
        const containers = document.querySelectorAll('article, .event, [class*="event"], .show, section');

        containers.forEach(container => {
          const text = container.innerText || '';
          
          // Look for date patterns
          const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/i;
          const dateMatch = text.match(datePattern);
          if (!dateMatch) return;

          let title = '';
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }
          
          if (!title || title.length < 4) return;
          if (seen.has(title)) return;
          seen.add(title);

          // Get REAL POSTER IMAGE
          let imageUrl = null;
          const img = container.querySelector('img:not([src*="logo"]):not([alt*="logo"])');
          if (img) {
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
              imageUrl = src;
            }
          }

          // Get description from event container
          let description = '';
          const descEl = container.querySelector('p, .description, .event-description, .event-content');
          if (descEl) {
            description = descEl.textContent.trim();
            if (description.length > 500) description = description.substring(0, 500) + '...';
          }

          // Get event-specific URL from show_listings link if available
          let eventUrl = 'https://www.rickshawtheatre.com/';
          const linkEl = container.querySelector('a[href*="show_listings"], a[href*="/event"]');
          if (linkEl) {
            const href = linkEl.href;
            if (href && href.startsWith('http')) eventUrl = href;
          }

          if (title && title.length > 3 && !title.toLowerCase().includes('get tickets')) {
            events.push({
              title,
              date: dateMatch[0],
              url: eventUrl,
              imageUrl: imageUrl,
              description: description
            });
          }
        });

        return events;
      });

      console.log(`Found ${eventData.length} events from Rickshaw Theatre`);

      const events = [];
      const seen = new Set();

      eventData.forEach(({ title, date, url, imageUrl }) => {
        const key = title.toLowerCase().trim();
        if (seen.has(key)) return;
        seen.add(key);

        console.log(`✓ ${title} | ${date || 'TBD'}`);

        // Clean and convert date to ISO format
        let isoDate = null;
        if (date) {
          // Clean the date string (remove tabs, newlines, ordinals)
          const cleanDate = date.replace(/\s+/g, ' ').replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
          const parsed = new Date(cleanDate);
          if (!isNaN(parsed)) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            isoDate = `${y}-${m}-${d}`;
          }
        }

        events.push({
          id: uuidv4(),
          title: title,
          date: isoDate || date,
          startDate: isoDate ? new Date(isoDate + 'T00:00:00.000Z') : null,
          time: null,
          url: url || 'https://www.rickshawtheatre.com',
          venue: { name: 'Rickshaw Theatre', address: '254 East Hastings Street, Vancouver, BC V6A 1P1', city: 'Vancouver' },
          description: '',
          category: 'Concert',
          city: 'Vancouver',
          imageUrl: imageUrl || null,  // Real poster image or null
          source: 'Rickshaw Theatre'
        });
      });

      console.log(`\n✅ Found ${events.length} Rickshaw Theatre events`);
      return filterEvents(events);

    } catch (error) {
      console.error('Error scraping Rickshaw Theatre events:', error.message);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};


module.exports = RickshawTheatreEvents.scrape;
