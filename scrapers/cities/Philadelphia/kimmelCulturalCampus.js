/**
 * Kimmel Cultural Campus Events Scraper
 * URL: https://www.kimmelculturalcampus.org/events
 * Major performing arts campus in Philadelphia
 * Broadway, classical, dance, comedy, family shows
 * Venues: Kimmel Center, Academy of Music, Miller Theater, Marian Anderson Hall, Forrest Theatre
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const venueMap = {
  'kimmel center': { name: 'Kimmel Center', address: '300 S Broad St, Philadelphia, PA 19102' },
  'academy of music': { name: 'Academy of Music', address: '240 S Broad St, Philadelphia, PA 19102' },
  'miller theater': { name: 'Miller Theater', address: '250 S Broad St, Philadelphia, PA 19102' },
  'marian anderson hall': { name: 'Marian Anderson Hall', address: '300 S Broad St, Philadelphia, PA 19102' },
  'forrest theatre': { name: 'Forrest Theatre', address: '1114 Walnut St, Philadelphia, PA 19107' }
};

const KimmelCulturalCampusEvents = {
  async scrape(city = 'Philadelphia') {
    console.log('🎭 Scraping Kimmel Cultural Campus...');

    try {
      const response = await axios.get('https://www.kimmelculturalcampus.org/events', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seen = new Set();

      const months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'april': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03',
        'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      $('a.event-item').each((i, el) => {
        const card = $(el);

        const title = card.find('.event-item__title').text().trim();
        if (!title || title.length < 2) return;

        const url = card.attr('href');
        if (!url || !url.startsWith('http')) return;

        const dateText = card.find('.event-item__date').text().trim();
        if (!dateText) return;

        // Parse "Mar 20, 2026", "Mar 20 - Mar 21, 2026", "April 4, 2026", "Apr 17 - Apr 19, 2026"
        const dateMatch = dateText.match(/(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:\s*[-–]\s*(?:\w+\s+)?\d{1,2})?,?\s*(\d{4})/i);
        if (!dateMatch) return;

        const monthKey = dateMatch[1].toLowerCase().substring(0, 3);
        const monthNum = months[monthKey] || months[dateMatch[1].toLowerCase()];
        if (!monthNum) return;
        const day = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        const isoDate = `${year}-${monthNum}-${day}`;

        if (new Date(isoDate) < new Date()) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract venue
        const venueName = card.find('.event-item__venue').text().trim();
        const venueKey = venueName.toLowerCase();
        const venueInfo = venueMap[venueKey] || {
          name: venueName || 'Kimmel Cultural Campus',
          address: '300 S Broad St, Philadelphia, PA 19102'
        };

        // Extract image
        const img = card.find('.event-item__image');
        let imageUrl = img.attr('src') || null;

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            ...venueInfo,
            city: 'Philadelphia'
          },
          city: 'Philadelphia',
          category: 'Performing Arts',
          source: 'Kimmel Cultural Campus'
        });
      });

      console.log(`  ✅ Found ${events.length} Kimmel Cultural Campus events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Kimmel Cultural Campus error: ${error.message}`);
      return [];
    }
  }
};

module.exports = KimmelCulturalCampusEvents.scrape;
