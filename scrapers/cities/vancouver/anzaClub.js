/**
 * The Anza Club Events Scraper
 * URL: https://www.anzaclub.org/new-events
 * Community venue in Mount Pleasant, Vancouver
 * Live music, trivia, comedy, and community events
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const AnzaClubEvents = {
  async scrape(city = 'Vancouver') {
    console.log('🎸 Scraping The Anza Club...');
    let browser;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

      // Squarespace-based events page
      await page.goto('https://www.anzaclub.org/new-events', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await delay(3000);

      // Scroll to load lazy content
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 600));
        await delay(800);
      }

      const eventData = await page.evaluate(() => {
        const events = [];
        const seen = new Set();

        // Squarespace events use .eventlist-event or similar patterns
        const containers = document.querySelectorAll(
          '.eventlist-event, .sqs-block-events, .summary-item, ' +
          '[class*="eventlist"], [data-type="events"], article, ' +
          '.eventitem, .event-item, .list-item'
        );

        containers.forEach(container => {
          const titleEl = container.querySelector(
            'h1, h2, h3, h4, .eventlist-title, .summary-title, [class*="title"]'
          );
          const title = titleEl ? titleEl.textContent.trim() : '';
          if (!title || title.length < 3 || seen.has(title)) return;
          if (/^(home|about|contact|menu|hall calendar|new events|membership|about the event|private event|read more|learn more|buy tickets|get tickets|rsvp)$/i.test(title)) return;
          seen.add(title);

          let url = '';
          const linkEl = titleEl ? titleEl.querySelector('a') || titleEl.closest('a') : null;
          if (linkEl) {
            url = linkEl.href;
            if (url && !url.startsWith('http')) url = 'https://www.anzaclub.org' + url;
          }
          if (!url) {
            const anyLink = container.querySelector('a[href*="event"]');
            if (anyLink) url = anyLink.href;
          }

          let dateText = '';
          const dateEl = container.querySelector(
            'time, [datetime], .event-date, .eventlist-meta-date, ' +
            '.summary-metadata-item--date, [class*="date"]'
          );
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }
          if (!dateText) {
            const text = container.textContent;
            const dateMatch = text.match(
              /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[,.]?\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4})/i
            ) || text.match(
              /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?[,.]?\s*\d{0,4})/i
            );
            if (dateMatch) dateText = (dateMatch[1] || dateMatch[0]).trim();
          }

          let imageUrl = null;
          const img = container.querySelector('img:not([src*="logo"]):not([src*="icon"])');
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || img.getAttribute('data-image');
          }

          let description = '';
          const descEl = container.querySelector(
            '.eventlist-description, .summary-excerpt, p, [class*="desc"], [class*="excerpt"]'
          );
          if (descEl) {
            description = descEl.textContent.trim();
          }

          events.push({ title, dateText, url, imageUrl, description });
        });

        return events;
      });

      await browser.close();

      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12',
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
        'oct': '10', 'nov': '11', 'dec': '12'
      };

      const events = [];
      const currentYear = new Date().getFullYear();

      for (const item of eventData) {
        let isoDate = null;

        if (item.dateText) {
          const isoMatch = item.dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) {
            isoDate = isoMatch[0];
          } else {
            const patterns = [
              /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i,
              /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+),?\s*(\d{4})?/i
            ];
            for (const p of patterns) {
              const m = item.dateText.match(p);
              if (m) {
                if (months[m[1].toLowerCase()]) {
                  isoDate = `${m[3] || currentYear}-${months[m[1].toLowerCase()]}-${m[2].padStart(2, '0')}`;
                } else if (months[m[2].toLowerCase()]) {
                  isoDate = `${m[3] || currentYear}-${months[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
                }
                break;
              }
            }
          }
        }

        if (!isoDate) continue;
        if (new Date(isoDate) < new Date()) continue;
        if (!item.url) continue;

        events.push({
          id: uuidv4(),
          title: item.title,
          date: isoDate,
          url: item.url,
          imageUrl: item.imageUrl || null,
          description: item.description || '',
          venue: {
            name: 'The Anza Club',
            address: '3 W 8th Ave, Vancouver, BC V5Y 1M8',
            city: 'Vancouver'
          },
          latitude: 49.2637,
          longitude: -123.1016,
          city: 'Vancouver',
          category: 'Music',
          source: 'The Anza Club'
        });
      }

      const unique = [];
      const seenKeys = new Set();
      for (const e of events) {
        const key = `${e.title}|${e.date}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); unique.push(e); }
      }

      console.log(`  ✅ Found ${unique.length} Anza Club events`);
      return unique;

    } catch (error) {
      console.error(`  ⚠️ Anza Club error: ${error.message}`);
      if (browser) await browser.close();
      return [];
    }
  }
};

module.exports = AnzaClubEvents.scrape;
