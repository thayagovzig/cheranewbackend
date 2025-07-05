import NodeCache from 'node-cache';
import logger from '../config/logger.js';

class OTPService {
  constructor() {
    // Cache with TTL from environment variable (in minutes)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
    this.cache = new NodeCache({ 
      stdTTL: expiryMinutes * 60, // TTL in seconds
      checkperiod: 60 
    });
  }

  generateOTP() {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOTP(phoneNumber, otp) {
    const key = `otp_${phoneNumber}`;
    const data = {
      otp,
      timestamp: Date.now(),
      attempts: 0
    };
    this.cache.set(key, data);
    logger.debug(`OTP stored for ${phoneNumber}: ${otp} (expires in ${this.cache.options.stdTTL} seconds)`);
  }

  verifyOTP(phoneNumber, inputOTP) {
    const key = `otp_${phoneNumber}`;
    const data = this.cache.get(key);
    
    if (!data) {
      logger.warn(`No OTP found for ${phoneNumber}`);
      return false;
    }
    
    // Increment attempts
    data.attempts += 1;
    
    // Check if too many attempts (max 3)
    if (data.attempts > 3) {
      this.cache.del(key);
      logger.warn(`Too many OTP attempts for ${phoneNumber}`);
      return false;
    }
    
    // Update attempts count
    this.cache.set(key, data);
    
    // Verify OTP
    const isValid = data.otp === inputOTP;
    
    if (isValid) {
      logger.info(`OTP verified successfully for ${phoneNumber}`);
    } else {
      logger.warn(`Invalid OTP attempt for ${phoneNumber}. Attempt ${data.attempts}/3`);
    }
    
    return isValid;
  }

  clearOTP(phoneNumber) {
    const key = `otp_${phoneNumber}`;
    this.cache.del(key);
    logger.debug(`OTP cleared for ${phoneNumber}`);
  }

  // Get remaining attempts
  getRemainingAttempts(phoneNumber) {
    const key = `otp_${phoneNumber}`;
    const data = this.cache.get(key);
    
    if (!data) return 0;
    return Math.max(0, 3 - data.attempts);
  }

  // Get OTP expiry time
  getExpiryTime(phoneNumber) {
    const key = `otp_${phoneNumber}`;
    const ttl = this.cache.getTtl(key);
    
    return ttl > 0 ? new Date(ttl) : null;
  }
}

export const otpService = new OTPService();