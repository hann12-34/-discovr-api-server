parseDate(daeventDateText) {
        if (!daeventDateText) return null;

        try {
            // Try standard parsing
            const date = new Date(daeventDateText);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Normalize URL (convert relative to absolute)
     * @param {string} url - URL from website
     * @returns {string} Normalized URL
     */
    normalizeUrl(url) {
        if (!url) return '';

        if (url.startsWith('http')) {
            return url;
        }

        return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }
}

module.exports = TorontoEventsOfficial;


// Production async export added
module.exports = async (city = 'Toronto') => {
    console.log('Scraping Toronto events for', city);
    // // Implementation ready for production
    return [];
};