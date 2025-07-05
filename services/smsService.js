import logger from '../config/logger.js';
import axios from 'axios';

class SMSService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  async sendOTP(phoneNumber) {
    try {
      if (this.isDevelopment) {
        // Mock SMS service for development
        logger.info(`[MOCK SMS] Sending OTP to ${phoneNumber}`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          messageId: `mock_${Date.now()}`,
          message: 'OTP sent successfully (Development Mode)'
        };
      }

      // Production Twilio Verify implementation
      return await this.sendTwilioVerify(phoneNumber);

    } catch (error) {
      logger.error('SMS Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTwilioVerify(phoneNumber) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      logger.debug(`Twilio config check: SID=${!!accountSid}, Token=${!!authToken}, ServiceSID=${!!verifyServiceSid}`);

      if (!accountSid || !authToken || !verifyServiceSid) {
        logger.error(`Missing Twilio config - SID: ${accountSid}, Token: ${authToken}, ServiceSID: ${verifyServiceSid}`);
        throw new Error('Twilio configuration missing');
      }

      const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
      const params = new URLSearchParams();
      params.append('To', `+91${phoneNumber}`);
      params.append('Channel', 'sms');

      const response = await axios.post(url, params, {
        auth: {
          username: accountSid,
          password: authToken
        }
      });

      logger.info(`Twilio Verify SMS sent to ${phoneNumber}`);

      return {
        success: true,
        messageId: response.data.sid,
        message: 'OTP sent successfully'
      };

    } catch (error) {
      logger.error('Twilio Verify SMS Error:', error);
      throw error;
    }
  }

  async verifyTwilioOTP(phoneNumber, otp) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (!accountSid || !authToken || !verifyServiceSid) {
        throw new Error('Twilio configuration missing');
      }

      const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
      const params = new URLSearchParams();
      params.append('To', `+91${phoneNumber}`);
      params.append('Code', otp);

      const response = await axios.post(url, params, {
        auth: {
          username: accountSid,
          password: authToken
        }
      });

      const isValid = response.data.status === 'approved';
      
      if (isValid) {
        logger.info(`Twilio OTP verified successfully for ${phoneNumber}`);
      } else {
        logger.warn(`Invalid Twilio OTP attempt for ${phoneNumber}`);
      }

      return {
        success: isValid,
        status: response.data.status
      };

    } catch (error) {
      logger.error('Twilio Verify OTP Error:', error);
      if (error.response && error.response.status === 404) {
        // Verification not found or expired
        return {
          success: false,
          status: 'expired'
        };
      }
      throw error;
    }
  }

  // Method to send custom messages
  async sendMessage(phoneNumber, message) {
    try {
      if (this.isDevelopment) {
        logger.info(`[MOCK SMS] Sending message to ${phoneNumber}: ${message}`);
        return { success: true };
      }

      // Production implementation
      return await this.sendTwilioMessage(phoneNumber, message);
      
    } catch (error) {
      logger.error('Send Message Error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const smsService = new SMSService();