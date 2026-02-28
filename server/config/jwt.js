require('dotenv').config();

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'trichyfix_jwt_secret_key_2026_secure',
    JWT_EXPIRES_IN: '12h',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'trichyfix_refresh_token_secret_2026_secure',
    REFRESH_TOKEN_EXPIRES_IN: '24h',
    OTP_EXPIRES_IN: 5 * 60 * 1000, // 5 minutes
    SALT_ROUNDS: 10
};
