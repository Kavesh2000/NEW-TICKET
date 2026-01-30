const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

console.log('[INIT] Setting up middleware...');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

console.log('[INIT] Middleware ready');

const TICKETS_FILE = path.join(__dirname, 'tickets.json');

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

function saveTickets(tickets) {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    } catch (error) {
        console.error('[ERROR] Saving tickets:', error.message);
    }
}

// Health check
app.get('/api/health', (req, res) => {
  console.log('[HEALTH] Check requested');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get tickets
app.get('/api/tickets', (req, res) => {
    console.log('[GET] /api/tickets request');
    try {
        const tickets = loadTickets();
        console.log('[GET] Loaded', tickets.length, 'tickets');
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
    console.log('[POST] /api/tickets request');
    try {
        const ticketData = req.body;
        console.log('[POST] Data:', ticketData.id || 'no-id');
        
        const tickets = loadTickets();
        tickets.push(ticketData);
        saveTickets(tickets);
        
        console.log('[POST] Saved successfully');
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

console.log('[INIT] Starting server on port', PORT);
app.listen(PORT, () => {
  console.log('[LISTEN] Server running on port ' + PORT);
});

process.on('uncaughtException', (error) => {
  console.error('[CRASH] Uncaught Exception:', error);
  process.exit(1);
});
