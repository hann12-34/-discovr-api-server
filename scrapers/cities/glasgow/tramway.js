/**
 * Tramway Glasgow Events Scraper
 * URL: https://www.tramway.org/whats-on
 * Contemporary arts venue in Glasgow's Southside
 * Visual art, theatre, dance, music, festivals
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const TramwayEvents = {
  async scrape(city = 'Glasgow') {
    console.log('🎭 Scraping Tramway Glasgow...');

    try {
      const response = await axios.get('https://www.tramway.org/whats-on', {
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
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const currentYear = new Date().getFullYear();

      $('.card').each((i, el) => {
        const card = $(el);

        const title = card.find('.card__title').text().trim();
        if (!title || title.length < 2) return;

        const link = card.closest('a').attr('href') || card.find('a').first().attr('href');
        if (!link) return;
        const url = link.startsWith('http') ? link : 'https://www.tramway.org' + link;

        const dateText = card.find('.card__date').text().trim();
        if (!dateText) return;

        // Parse dates like "20th Mar 2026", "20th - 21st Mar 2026", "15th Apr 2026"
        // For ranges, use start date. Format: "DDth Mon YYYY" or "DDth Mon"
        const dateMatch = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
        
        let isoDate;
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthKey = dateMatch[2].toLowerCase().substring(0, 3);
          const monthNum = months[monthKey];
          if (!monthNum) return;
          isoDate = `${dateMatch[3]}-${monthNum}-${day}`;
        } else {
          // Try "20th Mar" without year, or "20th - 21st Mar 2026"
          const shortMatch = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:-\s+\d{1,2}(?:st|nd|rd|th)?\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
          if (shortMatch) {
            const day = shortMatch[1].padStart(2, '0');
            const monthKey = shortMatch[2].toLowerCase().substring(0, 3);
            const monthNum = months[monthKey];
            if (!monthNum) return;
            isoDate = `${shortMatch[3]}-${monthNum}-${day}`;
          } else {
            // Try "20th Mar 2026" pattern at end of range like "27th Sep 2025 - 11th May 2026"
            const rangeMatch = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\s*$/i);
            if (!rangeMatch) return;
            // Use end date for ongoing exhibitions
            const day = rangeMatch[1].padStart(2, '0');
            const monthKey = rangeMatch[2].toLowerCase().substring(0, 3);
            const monthNum = months[monthKey];
            if (!monthNum) return;
            // Try to find start date
            const startMatch = dateText.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i);
            if (startMatch) {
              const sDay = startMatch[1].padStart(2, '0');
              const sMonthKey = startMatch[2].toLowerCase().substring(0, 3);
              const sMonthNum = months[sMonthKey];
              if (sMonthNum) {
                isoDate = `${startMatch[3]}-${sMonthNum}-${sDay}`;
              }
            }
            if (!isoDate) {
              isoDate = `${rangeMatch[3]}-${monthNum}-${day}`;
            }
          }
        }

        if (!isoDate) return;
        if (new Date(isoDate) < new Date(Date.now() - 86400000 * 30)) return;

        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image
        const img = card.find('.card__img img');
        let imageUrl = img.attr('src') || img.attr('data-src') || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://www.tramway.org' + imageUrl;
        }

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            name: 'Tramway',
            address: '25 Albert Dr, Glasgow G41 2PE, UK',
            city: 'Glasgow'
          },
          city: 'Glasgow',
          category: 'Arts',
          source: 'Tramway'
        });
      });

      console.log(`  ✅ Found ${events.length} Tramway Glasgow events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Tramway Glasgow error: ${error.message}`);
      return [];
    }
  }
};

module.exports = TramwayEvents.scrape;
