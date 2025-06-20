/**
 * Request logger middleware for Discovr API server
 * Logs details about incoming API requests
 */
const logger = (req, res, next) => {
    const start = Date.now();
    
    // Log request details
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    
    // Log request headers
    if (process.env.NODE_ENV !== 'production') {
        console.log('Headers:', JSON.stringify(req.headers));
    }
    
    // Capture the original end method
    const originalEnd = res.end;
    
    // Override the end method
    res.end = function() {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        
        // Call the original end method
        return originalEnd.apply(this, arguments);
    };
    
    next();
};

module.exports = logger;
