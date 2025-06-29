const axios = require('axios');

const VENUE_URL = 'https://tickets.vanartgallery.bc.ca/events';

(async () => {
    console.log('--- Fetching HTML for Vancouver Art Gallery Ticketing ---');
    try {
        const { data } = await axios.get(VENUE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
            }
        });
        console.log('--- HTML Content ---');
        console.log(data);
        console.log('--------------------');
    } catch (error) {
        console.error('Error fetching HTML:', error.message);
    }
})();
