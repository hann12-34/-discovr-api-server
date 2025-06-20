/**
 * Email Service for sending notifications
 * 
 * This is a simple implementation that can be extended to use
 * any email provider like SendGrid, Mailgun, SES, etc.
 */

const nodemailer = require('nodemailer');
const config = require('../config');

// Simple in-memory queue to prevent email flooding
const emailQueue = [];
let isProcessingQueue = false;
let lastEmailSent = null;

// Configure mail transporter
let transporter = null;

// Initialize based on environment
function initializeTransporter() {
  if (transporter) return transporter;
  
  if (process.env.NODE_ENV === 'development') {
    // In development, use ethereal.email for testing
    nodemailer.createTestAccount().then(testAccount => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Development email service initialized');
      console.log('Test email account:', testAccount.user);
    });
  } else {
    // In production, use configured SMTP settings
    const smtpConfig = {
      host: config.email?.host || 'smtp.example.com',
      port: config.email?.port || 587,
      secure: config.email?.secure || false,
      auth: {
        user: config.email?.user || '',
        pass: config.email?.password || ''
      }
    };
    
    transporter = nodemailer.createTransport(smtpConfig);
    console.log('Production email service initialized');
  }
  
  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content
 * @param {String} options.html - HTML content
 * @returns {Promise} - Promise resolving to info about the sent message
 */
async function sendEmail(options) {
  // Add to queue with timestamp
  emailQueue.push({
    ...options,
    timestamp: Date.now()
  });
  
  // Start processing if not already processing
  if (!isProcessingQueue) {
    processEmailQueue();
  }
}

/**
 * Process the email queue with rate limiting
 */
async function processEmailQueue() {
  if (isProcessingQueue) return;
  
  try {
    isProcessingQueue = true;
    
    while (emailQueue.length > 0) {
      // Apply rate limiting - max 1 email per 10 seconds
      if (lastEmailSent && Date.now() - lastEmailSent < 10000) {
        const waitTime = 10000 - (Date.now() - lastEmailSent);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Get next email to send
      const email = emailQueue.shift();
      
      // Initialize transporter if needed
      if (!transporter) {
        initializeTransporter();
      }
      
      // If transporter still not available, requeue and exit
      if (!transporter) {
        emailQueue.unshift(email);
        isProcessingQueue = false;
        return;
      }
      
      try {
        // Prepare mail options
        const mailOptions = {
          from: config.email?.from || 'Discovr Scraper <noreply@example.com>',
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html
        };
        
        // Send the email
        const info = await transporter.sendMail(mailOptions);
        lastEmailSent = Date.now();
        
        console.log('Email sent:', info.messageId);
        
        // In development, log the test URL
        if (process.env.NODE_ENV === 'development') {
          console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }
      } catch (err) {
        console.error('Error sending email:', err);
        
        // Requeue with backoff if recent
        if (Date.now() - email.timestamp < 3600000) { // 1 hour
          emailQueue.push(email);
        } else {
          console.error('Email dropped after multiple failures:', email.subject);
        }
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

module.exports = {
  sendEmail,
  initializeTransporter
};
