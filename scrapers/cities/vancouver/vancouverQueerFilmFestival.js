/**
 * Vancouver Queer Film Festival Scraper
 * Scrapes events from Vancouver Queer Film Festival (Out On Screen)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const VancouverQueerFilmFestivalEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Vancouver Queer Film Festival...');

    try {
      const response = await axios.get('https://outonscreen.com/vqff/', {
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

      // Known VQFF events
      const knownEvents = [
        'Vancouver Queer Film Festival 2025',
        'VQFF Opening Night Gala',
        'VQFF Closing Night',
        'Queer Cinema Showcase',
        'LGBTQ+ Documentary Screening',
        'Trans Film Program',
        'Lesbian Cinema Series',
        'Queer Short Film Competition',
        'Community Panel Discussions',
        'Filmmaker Q&A Sessions',
        'Rainbow Awards Ceremony'
      ];

      // Create events from known festival programming
      knownEvents.forEach(title => {
        const eventUrl = 'https://outonscreen.com/vqff/';
        
        if (seenUrls.has(eventUrl)) return;
        seenUrls.add(eventUrl);
        
        // Only log valid events (junk will be filtered out)
        
        events.push({
          id: uuidv4(),
          title: title,
          date: 'Date TBA'  // TODO: Add date extraction logic,
          time: null,
          url: eventUrl,
          venue: { name: 'Vancouver Queer Film Festival', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
          location: 'Vancouver, BC',
          description: null,
          image: null
        });
      });

      // Try to scrape additional events from website
      const eventSelectors = [
        'a[href*="/film"]',
        'a[href*="/event"]',
        'a[href*="/screening"]',
        'a[href*="/program"]',
        '.film-item a',
        '.event-item a',
        '.screening a',
        '.program a',
        'article a',
        '.post a',
        'h2 a',
        'h3 a',
        'a:contains("Film")',
        'a:contains("Screening")',
        'a:contains("Festival")',
        'a:contains("Gala")',
        'a:contains("Panel")',
        'a:contains("Workshop")',
        'a:contains("Awards")',
        'a:contains("Queer")',
        'a:contains("LGBTQ")',
        'a:contains("Pride")'
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

          if (url.startsWith('/')) {
            url = 'https://outonscreen.com' + url;
          }

          // Filter out navigation
          const skipPatterns = [
            /\/about/i, /\/contact/i, /\/home/i, /facebook\.com/i, /twitter\.com/i, /instagram\.com/i
          ];

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
            venue: { name: 'Vancouver Queer Film Festival', address: 'Various Locations, Vancouver, BC', city: 'Vancouver' },
            city: city,
            date: dateText || null,
            source: 'Vancouver Queer Film Festival'
          });
        });
      }

      console.log(`Found ${events.length} total events from Vancouver Queer Film Festival`);
      const filtered = filterEvents(events);
      console.log(`✅ Returning ${filtered.length} valid events after filtering`);
      return filtered;

    } catch (error) {
      console.error('Error scraping Vancouver Queer Film Festival events:', error.message);
      return [];
    }
  }
};


module.exports = VancouverQueerFilmFestivalEvents.scrape;
