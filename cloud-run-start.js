/**
 * Cloud Run startup script
 * Ensures the app listens on the correct port
 */

// Start the actual server
require('./server');

console.log('Cloud Run startup script executed');
console.log(`PORT environment variable: ${process.env.PORT}`);
