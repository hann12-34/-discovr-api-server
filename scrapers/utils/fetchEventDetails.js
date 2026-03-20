/**
 * Shared utility to fetch image AND description from event detail pages
 * Used by all city scraper coordinators to enrich events missing data
 * NO FALLBACKS - only real data from event pages
 */

const axios = require('axios');
const cheerio = require('cheerio');

const LISTING_PATTERNS = [
    /\/events\/?$/i, /\/calendar\/?$/i, /\/shows\/?$/i,
    /\/whats-on\/?$/i, /\/schedule\/?$/i, /\/upcoming\/?$/i
];

const GENERIC_IMAGE_PATTERNS = [
    /logo/i, /placeholder/i, /default/i, /favicon/i, /icon/i,
    /spacer/i, /pixel/i, /tracking/i, /blank/i, /1x1/i
];

async function fetchEventDetails(url) {
    const result = { image: null, description: null };
    if (!url || !url.startsWith('http')) return result;
    if (LISTING_PATTERNS.some(p => p.test(url))) return result;

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);

        // Extract og:image
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage && !GENERIC_IMAGE_PATTERNS.some(p => p.test(ogImage))) {
            result.image = ogImage;
        }

        // Extract description from meta tags
        const ogDesc = $('meta[property="og:description"]').attr('content');
        const metaDesc = $('meta[name="description"]').attr('content');
        const twitterDesc = $('meta[name="twitter:description"]').attr('content');
        let desc = ogDesc || metaDesc || twitterDesc || null;

        // Fallback: try content selectors on page
        if (!desc) {
            const contentSelectors = [
                '.event-description', '.description', '.event-content',
                '.entry-content', '.post-content', '.content',
                'article p', '.event-details p', 'main p'
            ];
            for (const sel of contentSelectors) {
                const text = $(sel).first().text().trim();
                if (text && text.length > 30 && text.length < 2000) {
                    desc = text;
                    break;
                }
            }
        }

        if (desc) {
            desc = desc.replace(/\s+/g, ' ').trim();
            if (desc.length > 1000) desc = desc.substring(0, 1000) + '...';
            if (desc.length >= 20) result.description = desc;
        }

        return result;
    } catch (e) {
        return result;
    }
}

/**
 * Enhance an array of events by fetching missing image/description from detail pages
 * @param {Array} events - Array of event objects
 * @returns {Promise<Array>} - Enhanced events
 */
async function enhanceEvents(events) {
    if (!Array.isArray(events)) return events;
    for (const event of events) {
        const needsImage = !event.image && !event.imageUrl;
        const needsDesc = !event.description;
        if ((needsImage || needsDesc) && event.url) {
            const details = await fetchEventDetails(event.url);
            if (needsImage && details.image) {
                event.image = details.image;
                event.imageUrl = details.image;
            }
            if (needsDesc && details.description) {
                event.description = details.description;
            }
        }
    }
    return events;
}

module.exports = { fetchEventDetails, enhanceEvents };
