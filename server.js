const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));

console.log('[INIT] Server initializing on port', PORT);

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
        console.error('[ERROR] Loading tickets:', error.message);
    }
    return [];
}

// Save tickets to file
function saveTickets(tickets) {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
        console.log('[SUCCESS] Saved', tickets.length, 'tickets');
    } catch (error) {
        console.error('[ERROR] Saving tickets:', error.message);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('[HEALTH] Health check');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Get all tickets
app.get('/api/tickets', (req, res) => {
    try {
        console.log('[GET] Fetching tickets');
        const tickets = loadTickets();
        console.log('[GET] Returning', tickets.length, 'tickets');
        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('[ERROR] Getting tickets:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get tickets'
        });
    }
});

// Create ticket
app.post('/api/tickets', (req, res) => {
    try {
        console.log('[POST] Creating new ticket');
        const ticketData = req.body;
        console.log('[DATA] Received ticket:', ticketData.id);
        
        // Load existing tickets
        const tickets = loadTickets();
        console.log('[DB] Loaded', tickets.length, 'existing tickets');
        
        // Add new ticket
        tickets.push(ticketData);
        console.log('[ADD] Added ticket, new count:', tickets.length);
        
        // Save to file
        saveTickets(tickets);
        
        // Return success
        console.log('[SUCCESS] Ticket created:', ticketData.id);
        res.status(201).json({
            success: true,
            ticket: ticketData,
            message: 'Ticket created successfully'
        });
    } catch (error) {
        console.error('[ERROR] Creating ticket:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket',
            error: error.message
        });
    }
});

// Update ticket
app.put('/api/tickets/:id', (req, res) => {
    try {
        const ticketId = req.params.id;
        const updates = req.body;
        console.log('[PUT] Updating ticket:', ticketId);
        
        const tickets = loadTickets();
        const index = tickets.findIndex(t => t.id === ticketId);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        tickets[index] = { ...tickets[index], ...updates };
        saveTickets(tickets);
        
        console.log('[SUCCESS] Ticket updated:', ticketId);
        res.json({
            success: true,
            ticket: tickets[index],
            message: 'Ticket updated successfully'
        });
    } catch (error) {
        console.error('[ERROR] Updating ticket:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket'
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log('[404] Not found:', req.method, req.path);
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[EXCEPTION]', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('[LISTEN] Server running on port', PORT);
    console.log('[READY] Ready to accept connections');
});

// Handle server errors
server.on('error', (err) => {
    console.error('[SERVER_ERROR]', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('[CRASH]', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('[REJECTION]', err);
});

console.log('[BOOT] Server boot sequence complete');
