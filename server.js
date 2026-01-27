const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
// require('dotenv').config();

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Ticket storage
const TICKETS_FILE = path.join(__dirname, 'tickets.json');

// Load tickets from file
function loadTickets() {
    try {
        if (fs.existsSync(TICKETS_FILE)) {
            const data = fs.readFileSync(TICKETS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
    return [];
}

// Save tickets to file
function saveTickets(tickets) {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    } catch (error) {
        console.error('Error saving tickets:', error);
    }
}

// Email configuration (disabled)
// const emailConfig = {
//   host: process.env.SMTP_HOST || 'smtp.gmail.com',
//   port: process.env.SMTP_PORT || 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: process.env.EMAIL_USER || 'automation@maishabank.com',
//     pass: process.env.EMAIL_PASS || 'your-app-password'
//   }
// };

// Create email transporter (disabled)
// const transporter = nodemailer.createTransport(emailConfig);

// Test email configuration (disabled)
// transporter.verify((error, success) => {
//   if (error) {
//     console.log('Email configuration error (server will continue without email):', error.message);
//   } else {
//     console.log('Email server is ready to send messages');
//   }
// });

// Email templates
const emailTemplates = {
  leaveApproval: (data) => ({
    subject: `Leave Request ${data.status === 'approved' ? 'Approved' : 'Rejected'} - Maisha Bank`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Maisha Bank</h1>
          <p style="margin: 5px 0 0 0;">Leave Management System</p>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: ${data.status === 'approved' ? '#059669' : '#dc2626'}; margin-top: 0;">
            Leave Request ${data.status === 'approved' ? 'Approved' : 'Rejected'}
          </h2>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Employee:</strong> ${data.employeeName}</p>
            <p><strong>Department:</strong> ${data.department}</p>
            <p><strong>Leave Type:</strong> ${data.leaveType}</p>
            <p><strong>Duration:</strong> ${data.startDate} to ${data.endDate} (${data.days} days)</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            ${data.comments ? `<p><strong>Comments:</strong> ${data.comments}</p>` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from Maisha Bank Leave Management System.
            </p>
          </div>
        </div>

        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 Maisha Bank. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  leaveSubmitted: (data) => ({
    subject: 'Leave Request Submitted - Maisha Bank',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Maisha Bank</h1>
          <p style="margin: 5px 0 0 0;">Leave Management System</p>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #059669; margin-top: 0;">Leave Request Submitted Successfully</h2>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Employee:</strong> ${data.employeeName}</p>
            <p><strong>Department:</strong> ${data.department}</p>
            <p><strong>Leave Type:</strong> ${data.leaveType}</p>
            <p><strong>Duration:</strong> ${data.startDate} to ${data.endDate} (${data.days} days)</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
          </div>

          <p style="color: #6b7280;">
            Your leave request has been submitted and is pending approval. You will receive a notification once it's reviewed.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from Maisha Bank Leave Management System.
            </p>
          </div>
        </div>

        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 Maisha Bank. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request - Maisha Bank',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Maisha Bank</h1>
          <p style="margin: 5px 0 0 0;">Password Reset</p>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #059669; margin-top: 0;">Password Reset Request</h2>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hello ${data.employeeName},</p>
            <p>You have requested to reset your password. Click the button below to proceed:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #dc2626; font-size: 14px;">
              This link will expire in 24 hours. If you didn't request this reset, please ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from Maisha Bank System.
            </p>
          </div>
        </div>

        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 Maisha Bank. All rights reserved.</p>
        </div>
      </div>
    `
  }),

  generalNotification: (data) => ({
    subject: data.subject || 'Notification from Maisha Bank',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Maisha Bank</h1>
          <p style="margin: 5px 0 0 0;">System Notification</p>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <h2 style="color: #059669; margin-top: 0;">${data.title || 'System Notification'}</h2>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${data.message}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px;">
              This is an automated message from Maisha Bank System.
            </p>
          </div>
        </div>

        <div style="background-color: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p>&copy; 2024 Maisha Bank. All rights reserved.</p>
        </div>
      </div>
    `
  })
};

// API Routes

// Create ticket
app.post('/api/tickets', (req, res) => {
    try {
        const ticketData = req.body;
        
        // Generate unique ID if not provided
        if (!ticketData.id) {
            ticketData.id = 'TICK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        }
        
        // Set timestamp
        ticketData.timestamp = ticketData.timestamp || new Date().toISOString();
        
        // Calculate SLA
        const SLA_CONFIG = {
            'P1': 1 * 60 * 60 * 1000,
            'P2': 4 * 60 * 60 * 1000,
            'P3': 24 * 60 * 60 * 1000,
            'P4': 72 * 60 * 60 * 1000
        };
        const slaMs = SLA_CONFIG[ticketData.priority] || SLA_CONFIG['P4'];
        ticketData.sla_due = new Date(new Date(ticketData.timestamp).getTime() + slaMs).toISOString();
        
        // Load existing tickets
        const tickets = loadTickets();
        
        // Add new ticket
        tickets.push(ticketData);
        
        // Save tickets
        saveTickets(tickets);
        
        // Return the created ticket
        res.status(201).json({
            success: true,
            ticket: ticketData,
            message: 'Ticket created successfully'
        });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket'
        });
    }
});

// Get tickets (for admin or API access)
app.get('/api/tickets', (req, res) => {
    try {
        const tickets = loadTickets();
        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('Error getting tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tickets'
        });
    }
});

// Update ticket
app.put('/api/tickets/:id', (req, res) => {
    try {
        const ticketId = req.params.id;
        const updates = req.body;
        
        // Load existing tickets
        const tickets = loadTickets();
        
        // Find and update the ticket
        const ticketIndex = tickets.findIndex(ticket => ticket.id === ticketId);
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        // Update the ticket
        tickets[ticketIndex] = { ...tickets[ticketIndex], ...updates };
        
        // Save tickets
        saveTickets(tickets);
        
        // Return the updated ticket
        res.json({
            success: true,
            ticket: tickets[ticketIndex],
            message: 'Ticket updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket'
        });
    }
});

// Email sending endpoint (disabled)
// app.post('/api/email/send', async (req, res) => {
//   try {
//     const { to, template, data } = req.body;

//     if (!to || !template) {
//       return res.status(400).json({ error: 'Missing required fields: to, template' });
//     }

//     const templateFunc = emailTemplates[template];
//     if (!templateFunc) {
//       return res.status(400).json({ error: 'Invalid template' });
//     }

//     const emailContent = templateFunc(data);

//     const mailOptions = {
//       from: `"Maisha Bank Automation" <${emailConfig.auth.user}>`,
//       to: to,
//       subject: emailContent.subject,
//       html: emailContent.html
//     };

//     const info = await transporter.sendMail(mailOptions);

//     console.log('Email sent successfully:', info.messageId);
//     res.json({
//       success: true,
//       messageId: info.messageId,
//       message: 'Email sent successfully'
//     });

//   } catch (error) {
//     console.error('Email sending error:', error);
//     res.status(500).json({
//       error: 'Failed to send email',
//       details: error.message
//     });
//   }
// });

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Maisha Bank Email Service'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;