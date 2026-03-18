/**
 * APP GLOBAL CONFIGURATION
 * Centralized file to manage environment settings.
 */
const Config = {
    /**
     * ENVIRONMENT SELECTOR
     * Options: 
     * 'dev'  -> Use local development settings (PC_IP and PORT).
     * 'prod' -> Use production settings (DOMAIN and HTTPS).
     */
    ENV: 'prod', 

    // Settings for local development (XAMPP / Artisan Serve)
    development: {
        PC_IP: '192.168.1.16', // Your current local machine IP
        PORT: '8000',           // Default Laravel port
        PROTOCOL: 'http',      // Local connection uses HTTP
    },

    // Settings for the live server (Mendo Developments)
    production: {
        DOMAIN: 'huerta.mendodevelopments.com', // Your production domain
        PROTOCOL: 'https',                      // Production REQUIRES HTTPS
    },

    /**
     * URL GENERATOR
     * Automatically constructs the API base URL based on the ENV selected above.
     * Use this in axios.js to keep your connection logic clean.
     */
    getApiUrl() {
        if (this.ENV === 'prod') {
            // Production format: https://domain.com/api
            return `${this.production.PROTOCOL}://${this.production.DOMAIN}/api`;
        }
        // Development format: http://192.168.1.XX:8000/api
        return `${this.development.PROTOCOL}://${this.development.PC_IP}:${this.development.PORT}/api`;
    },

    /**
     * PUSHER CHANNEL PREFIX GENERATOR
     * Ensures real-time events from production do not leak into local devices.
     * Use this in echo.ts and screen listeners to prefix channel names.
     */
    getChannelPrefix() {
        // Returns 'prod_' for production and 'dev_' for development
        return this.ENV === 'prod' ? 'prod_' : 'dev_';
    }
};

export default Config;