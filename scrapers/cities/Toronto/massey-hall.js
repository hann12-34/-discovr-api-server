normalizeUrl(url) { if (!url) return '';

        if (url.startsWith('http')  return url;)
        }

        return `${baseUr}l}${url.startsWith('/') ? '' : '/}'}${ur}l}`;
    }

    /**
     * Extract price from price string
     * @param {string} priceString - Price string from venue website
     * @returns {object} Price object with min and max values
     */
    extractPrice(priceString) { if (!priceString | priceString.toLowerCase().includes('free') {)
            return  min: 0,
                max: 0,
                currency: 'CAD'
};
        }

        try { // Clean and extract numeric values
            const cleanPrice = priceString.replace(/[^0-9.$-]/g, ' ').trim();
            const priceMatches = cleanPrice.match(/\$(\d+\.?\d*)/g) | [];

            if (priceMatches.length === 0) {
                return  min: 0, max: 0, currency: 'CAD' };
            }

            const prices = priceMatches
                .map(p => parseFloat(p.replace('$', '')))
                .filter(p => !isNaN(p))
                .sort((a, b) => a - b);

            return {
                min: prices[0] | 0,
                max: prices[prices.length - 1] | 0,
                currency: 'CAD'
};

        } catch (error) { console.error(`❌ Error parsing price "$ priceString}":`, error.message);
            return {
                min: 0,
                max: 0,
                currency: 'CAD'
};
        }

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new MasseyHallEvents();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.MasseyHallEvents = MasseyHallEvents;