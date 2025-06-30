const axios = require('axios');

const GRAPHQL_URL = 'https://api.livenation.com/graphql';

// The full GraphQL query discovered from the website's network traffic
const GRAPHQL_QUERY = `
  query EVENTS_PAGE($offset: Int!, $venue_id: String!, $include_genres: String, $start_date_time: String, $end_date_time: String) {
    getEvents(
      filter: {exclude_status_codes: ["cancelled", "postponed"], image_identifier: "RETINA_PORTRAIT_16_9", venue_id: $venue_id, start_date_time: $start_date_time, end_date_time: $end_date_time, include_genres: $include_genres}
      limit: 36
      offset: $offset
      order: "ascending"
      sort_by: "start_date"
    ) {
      artists {
        name
      }
      event_date_timestamp_utc
      name
      url
      venue {
        name
        location {
          address
        }
      }
    }
  }
`;

// The variables required by the query, including the Commodore's venue ID
const QUERY_VARIABLES = {
  offset: 0,
  venue_id: 'KovZpZAEkklA', // This is the specific ID for the Commodore Ballroom
};

async function scrapeCommodore() {
  console.log('🚀 Starting Commodore Ballroom scraper using direct GraphQL API...');

  try {
    const response = await axios.post(
      GRAPHQL_URL,
      {
        query: GRAPHQL_QUERY,
        variables: QUERY_VARIABLES,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          // This header is often required for GraphQL APIs associated with a specific site
          'Origin': 'https://www.commodoreballroom.com',
        },
      }
    );

    const eventsData = response.data.data.getEvents;

    if (!eventsData || eventsData.length === 0) {
      console.log('✅ No new events found from the Commodore GraphQL API.');
      return [];
    }

    // Map the GraphQL response to our standard event format
    const formattedEvents = eventsData.map(event => {
      return {
        name: event.name,
        description: event.artists.map(a => a.name).join(', '),
        venue: {
          name: event.venue.name,
          address: event.venue.location.address,
        },
        price: 'See website for details',
        startDate: new Date(event.event_date_timestamp_utc).toISOString(),
        sourceUrl: event.url,
        source: 'commodore-scraper',
      };
    });

    console.log(`✅ Successfully scraped ${formattedEvents.length} events from the Commodore Ballroom.`);
    return formattedEvents;

  } catch (error) {
    console.error('❌ Error scraping Commodore Ballroom via GraphQL:', error.response ? error.response.data : error.message);
    return [];
  }
}

module.exports = { scrapeCommodore };
