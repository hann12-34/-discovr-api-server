const getCityFromArgs = () => {
  const cityArg = process.argv.find(arg => arg.startsWith('--city='));
  if (!cityArg) {
    console.error('❌ Error: City argument not provided. Run scraper with --city=<CityName>');
    process.exit(1);
  }
  return cityArg.split('=')[1];
};

const tagEventWithCity = (event, city) => {
  // Standardize city name (e.g., 'new-york' -> 'New York')
  const cityName = city.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    ...event,
    city: cityName,
    location: `${cityName}, ${event.region || 'USA'}` // Default region can be adjusted
  };
};

module.exports = { getCityFromArgs, tagEventWithCity };
