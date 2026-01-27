# Maisha Bank Email Service Setup Guide

## Overview
Your Maisha Bank system now includes comprehensive email functionality that sends automated notifications for leave requests, approvals, rejections, and other system communications.

## Features
- ✅ **Leave Request Notifications**: Automatic emails when leave is submitted, approved, or rejected
- ✅ **Admin Notifications**: Alerts sent to administrators when new requests require review
- ✅ **Professional Templates**: Branded email templates with Maisha Bank styling
- ✅ **Multiple Templates**: Support for leave approvals, password resets, and general notifications
- ✅ **Error Handling**: Graceful fallback if email service is unavailable

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Email Settings
Edit the `.env` file with your email credentials:

```env
# For Gmail (recommended for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=automation@maishabank.com
EMAIL_PASS=your-gmail-app-password
```

### 3. Set Up Gmail (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password (not your regular password) in EMAIL_PASS

### 4. Start the Email Service
```bash
npm start
# or for development
npm run dev
```

### 5. Start Your Web Application
Open `index.html` in your browser and navigate to the Leave Management system.

## Email Templates Available

### 1. Leave Approval/Rejection (`leaveApproval`)
Sent to employees when their leave requests are approved or rejected.

### 2. Leave Submission (`leaveSubmitted`)
Sent to employees when they successfully submit a leave request.

### 3. Password Reset (`passwordReset`)
Sent when users request password resets (includes reset link).

### 4. General Notification (`generalNotification`)
For custom notifications and announcements.

## Email Flow Examples

### When Employee Submits Leave Request:
1. ✅ Employee receives confirmation email
2. ✅ All admin/Management users receive notification to review

### When Admin Approves Leave:
1. ✅ Employee receives approval notification with details

### When Admin Rejects Leave:
1. ✅ Employee receives rejection notification with reason

## Configuration Options

### Environment Variables
```env
# Email Service
SMTP_HOST=smtp.gmail.com          # Your SMTP server
SMTP_PORT=587                     # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=automation@maishabank.com  # Sender email address
EMAIL_PASS=your-app-password      # Email password or app password

# Server
PORT=3001                        # Port for the email service
```

### Alternative Email Providers

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
EMAIL_USER=postmaster@yourdomain.mailgun.org
EMAIL_PASS=your-mailgun-password
```

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

## Testing the Email Service

### 1. Health Check
Visit: `http://localhost:3001/api/health`

### 2. Test Email (via browser console)
```javascript
fetch('http://localhost:3001/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@maishabank.com',
    template: 'generalNotification',
    data: {
      title: 'Test Email',
      subject: 'Maisha Bank Email Test',
      message: '<p>This is a test email from your Maisha Bank system.</p>'
    }
  })
});
```

## Troubleshooting

### Common Issues

#### 1. "Authentication failed"
- For Gmail: Make sure you're using an App Password, not your regular password
- Check that 2FA is enabled on your Google account

#### 2. "Connection refused"
- Ensure the email service is running (`npm start`)
- Check that port 3001 is not blocked by firewall

#### 3. Emails not sending in production
- Verify SMTP settings with your email provider
- Check spam/junk folders
- Some providers block certain ports - try alternative ports

#### 4. CORS errors in browser
- The email service includes CORS headers for local development
- For production deployment, configure CORS appropriately

### Email Service Logs
Check the terminal/console where you ran `npm start` for detailed error messages and email sending confirmations.

## Security Considerations

### For Development
- Use App Passwords (Gmail) or API keys instead of regular passwords
- Keep `.env` file out of version control
- Use different credentials for development and production

### For Production
- Use dedicated email service providers (SendGrid, Mailgun, AWS SES)
- Implement rate limiting
- Add email validation and sanitization
- Consider email encryption for sensitive data
- Set up proper monitoring and alerting

## Integration with Other Modules

The email service can be easily integrated with other parts of your banking system:

### Password Reset System
```javascript
await sendEmail(user.email, 'passwordReset', {
  employeeName: user.name,
  resetLink: `https://yourbank.com/reset?token=${resetToken}`
});
```

### Ticket System Notifications
```javascript
await sendEmail(user.email, 'generalNotification', {
  title: 'Ticket Update',
  subject: 'Your Support Ticket Has Been Updated',
  message: `<p>Your ticket #${ticketId} status has changed to: ${newStatus}</p>`
});
```

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your email provider settings
3. Test with a simple email first
4. Ensure all dependencies are installed (`npm install`)

## Next Steps

1. **Test thoroughly** with your actual email credentials
2. **Customize email templates** to match your branding
3. **Add more templates** for other system notifications
4. **Implement in production** with a proper email service provider
5. **Add email preferences** for users to opt-in/out of notifications

---

**🎉 Your Maisha Bank system now has professional email communication capabilities!**