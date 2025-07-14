// Configuration file for API keys and sensitive data
// In production, these should be loaded from environment variables or a secure backend

const config = {
    // Mapbox configuration
    mapbox: {
        accessToken: process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiMjc1NDc3OTAwN3FxY29tIiwiYSI6ImNqajViOTRibjF3b3oza3Axdm83ajBqYzcifQ.E-WgBuOW5mlelsmBeUN47Q',
        // Note: In production, this token should be obtained from a secure backend
    },
    
    // Maptiler configuration
    maptiler: {
        apiKey: process.env.MAPTILER_API_KEY || 'tSrycxD3kDmTDWxY9Tm7',
    },
    
    // API endpoints
    endpoints: {
        mapboxDirections: 'https://api.mapbox.com/directions/v5/mapbox/driving',
        mapboxGeocoding: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
        maptilerStyle: 'https://api.maptiler.com/maps/streets-dark/style.json',
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else if (typeof window !== 'undefined') {
    window.config = config;
}