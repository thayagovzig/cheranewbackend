import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { smsService } from '../services/smsService.js';
import axios from 'axios';
import logger from '../config/logger.js';

export const sendOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
        errors: errors.array(),
      });
    }

    const { phoneNumber } = req.body;
    const smsResult = await smsService.sendOTP(phoneNumber);

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.',
      });
    }

    logger.info(`OTP sent to ${phoneNumber}`);

    // Submit to Google Form
    const googleFormUrl = `https://docs.google.com/forms/d/e/${process.env.GOOGLE_FORM_ID}/formResponse`;
    const formData = new URLSearchParams();
    formData.append(`entry.${process.env.GOOGLE_PHONE_NUMBER_ENTRY_ID}`, phoneNumber);

    axios.post(googleFormUrl, formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      .then(() => logger.info(`Data submitted to Google Form: ${phoneNumber}`))
      .catch((formError) => logger.error('Failed to submit data to Google Form:', formError));

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
    });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.',
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format',
        errors: errors.array(),
      });
    }

    const { phoneNumber, otp } = req.body;
    const verifyResult = smsService.isDevelopment
      ? { success: true }
      : await smsService.verifyTwilioOTP(phoneNumber, otp);

    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please try again.',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { phoneNumber, timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User authenticated: ${phoneNumber}`);
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.',
    });
  }
};