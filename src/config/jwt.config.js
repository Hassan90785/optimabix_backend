import dotenv from 'dotenv';
dotenv.config();

const jwtConfig = {
    secretKey: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: '7d' // Token valid for 7 days
};

export default jwtConfig;
