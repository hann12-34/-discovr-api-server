/**
 * Unity Theatre Liverpool Events Scraper
 * URL: https://www.unitytheatreliverpool.co.uk/whats-on/
 * Independent theatre in Liverpool
 * Theatre, comedy, music, spoken word, family shows
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const UnityTheatreEvents = {
  async scrape(city = 'Liverpool') {
    console.log('🎭 Scraping Unity Theatre Liverpool...');

    try {
      const response = await axios.get('https://www.unitytheatreliverpool.co.uk/whats-on/', {
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
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };

      const currentYear = new Date().getFullYear();

      $('.card--event').each((i, el) => {
        const card = $(el);

        // Extract title
        const title = card.find('.card__content-header h3').text().trim();
        if (!title || title.length < 2) return;

        // Extract URL
        const link = card.find('a.card__content-a[href*="/whats-on/"]').first();
        const url = link.attr('href');
        if (!url) return;

        // Extract date from card__content-footer p
        const dateText = card.find('.card__content-footer > p').first().text().trim();
        if (!dateText) return;

        // Parse dates like "18th March", "22nd - 23rd April", "5th May 2026"
        const dateMatch = dateText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+(\d{4}))?/i);
        if (!dateMatch) return;

        const day = dateMatch[1].padStart(2, '0');
        const monthNum = months[dateMatch[2].toLowerCase()];
        if (!monthNum) return;

        let year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
        if (!dateMatch[3] && parseInt(monthNum) < new Date().getMonth()) year++;
        const isoDate = `${year}-${monthNum}-${day}`;
        if (new Date(isoDate) < new Date()) return;

        // Deduplicate
        const key = `${title}|${isoDate}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);

        // Extract image from background-image style
        const fig = card.find('.card__cell--fig');
        const style = fig.attr('style') || '';
        const imgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        let imageUrl = imgMatch ? imgMatch[1] : null;

        // Extract genre
        const genre = card.find('.card__genre li').first().text().trim() || 'Theatre';

        events.push({
          id: uuidv4(),
          title,
          date: isoDate,
          url,
          imageUrl,
          description: '',
          venue: {
            name: 'Unity Theatre',
            address: '1 Hope Pl, Liverpool L1 9BG, UK',
            city: 'Liverpool'
          },
          city: 'Liverpool',
          category: genre,
          source: 'Unity Theatre'
        });
      });

      console.log(`  ✅ Found ${events.length} Unity Theatre Liverpool events`);
      return events;

    } catch (error) {
      console.error(`  ⚠️ Unity Theatre Liverpool error: ${error.message}`);
      return [];
    }
  }
};

module.exports = UnityTheatreEvents.scrape;
