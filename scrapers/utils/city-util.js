const getCityFromArgs = () => {
  const cityArg = process.argv.find(arg => arg.startsWith('--city='));
  if (!cityArg) {
    // Fallback for standalone execution or testing
    console.warn('⚠️ --city argument not provided. Defaulting to Toronto. This should only happen during standalone testing.');
    return 'Toronto'; 
  }
  return cityArg.split('=')[1];
};

module.exports = { getCityFromArgs };
