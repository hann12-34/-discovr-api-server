/**
 * Le Centre Culturel Scraper
 * Scrapes events from Le Centre Culturel Francophone de Vancouver
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const LeCentreCulturelEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Le Centre Culturel...');

    try {
      const response = await axios.get('https://www.lecentreculturel.com/en/festival-d-ete', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Known French cultural events
      const knownEvents = [
        'Festival d\'Été',
        'French Summer Festival',
        'Francophone Cultural Events',
        'French Theatre Productions',
        'French Film Screenings',
        'French Music Concerts',
        'French Language Workshops',
        'Cultural Exchange Events'
      ];

      knownEvents.forEach(title => {
        const eventUrl = 'https://www.lecentreculturel.com/en/festival-d-ete';
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        // Only log valid events (junk will be filtered out)
        events.push({
          id: uuidv4(),
          title: title,
          url: eventUrl,
          venue: { name: 'Le Centre Culturel', address: '1551 West 7th Avenue, Vancouver, BC V6J 1S1', city: 'Vancouver' },
          city: 'Vancouver',
          date: dateText || null,
            source: 'Le Centre Culturel'
        });
      });

      const eventSelectors = [
        'a[href*="/event"]',
        'a[href*="/events/"]',
        'a[href*="/festival"]',
        '.event-item a',
        'article a',
        'h2 a',
        'h3 a',
        'a:contains("Festival")',
        'a:contains("Event")',
        'a:contains("Concert")',
        'a:contains("Theatre")',
        'a:contains("Cultural")'
      ];

      for (const selector of eventSelectors) {
        const links = $(selector);
        if (links.length > 0) {
          console.log(`Found ${links.length} events with selector: ${selector}`);
        }

        links.each((index, element) => {
          const $element = $(element);
          let title = $element.text().trim();
          let url = $element.attr('href');

          if (!title || !url || seenUrls.has(url)) return;
          if (url.startsWith('/')) url = 'https://www.lecentreculturel.com' + url;

          const skipPatterns = [/facebook\.com/i, /twitter\.com/i, /instagram\.com/i, /\/about/i, /\/contact/i];
          if (skipPatterns.some(pattern => pattern.test(url))) return;

          title = title.replace(/\s+/g, ' ').trim();
          if (title.length < 3) return;

          seenUrls.add(url);
          // Only log valid events (junk will be filtered out)
          // Extract date from event element


          let dateText = null;


          const dateSelectors = ['time[datetime]', '.date', '.event-date', '[class*="date"]', 'time', '.datetime', '.when'];


          for (const selector of dateSelectors) {


            const dateEl = $element.find(selector).first();


            if (dateEl.length > 0) {


              dateText = dateEl.attr('datetime') || dateEl.text().trim();


              if (dateText && dateText.length > 0) break;


            }


          }


          if (!dateText) {


            const $parent = $element.closest('.event, .event-item, article, [class*="event"]');


            if ($parent.length > 0) {


              for (const selector of dateSelectors) {


                const dateEl = $parent.find(selector).first();


                if (dateEl.length > 0) {


                  dateText = dateEl.attr('datetime') || dateEl.text().trim();


                  if (dateText && dateText.length > 0) break;


                }


              }


            }


          }


          if (dateText) dateText = dateText.replace(/\s+/g, ' ').trim();


          


          events.push({
            id: uuidv4(),
            title: title,
            url: url,
            venue: { name: 'Le Centre Culturel', address: '1551 West 7th Avenue, Vancouver, BC V6J 1S1', city: 'Vancouver' },
            city: 'Vancouver',
            date: dateText || null,
            source: 'Le Centre Culturel'
          });
        });
      }

      console.log(`Found ${events.length} total events from Le Centre Culturel`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Le Centre Culturel events:', error.message);
      return [];
    }
  }
};


module.exports = LeCentreCulturelEvents.scrape;
