const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
const USERS_FILE = path.join(__dirname, 'users.json');
const ASSETS_FILE = path.join(__dirname, 'asset-register.json');

// Hash password utility
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Load users from file
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[ERROR] Loading users:', error.message);
    }
    return [];
}

// Save users to file
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('[SUCCESS] Saved', users.length, 'users');
    } catch (error) {
        console.error('[ERROR] Saving users:', error.message);
    }
}

// Load assets from file
function loadAssets() {
    try {
        if (fs.existsSync(ASSETS_FILE)) {
            const data = fs.readFileSync(ASSETS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[ERROR] Loading assets:', error.message);
    }
    return [];
}

// Save assets to file
function saveAssets(assets) {
    try {
        fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2));
        console.log('[SUCCESS] Saved', assets.length, 'asset owners');
    } catch (error) {
        console.error('[ERROR] Saving assets:', error.message);
    }
}

// Ensure asset register entries exist for each user
function syncAssetsWithUsers(users) {
    try {
        const assets = loadAssets();
        const ownersMap = new Map(assets.map(a => [String(a.owner_id), a]));
        let changed = false;

        for (const u of users) {
            const key = String(u.id);
            if (!ownersMap.has(key)) {
                const newOwner = {
                    owner_id: u.id,
                    owner_name: u.full_name,
                    owner_email: u.email,
                    assets: []
                };
                assets.push(newOwner);
                ownersMap.set(key, newOwner);
                changed = true;
                console.log('[ASSET] Created asset owner for user:', u.username, 'id=', u.id);
            }
        }

        if (changed) saveAssets(assets);
        return assets;
    } catch (e) {
        console.error('[ERROR] syncAssetsWithUsers', e.message);
        return [];
    }
}

// Get next numeric user ID (start from 123)
function getNextUserId() {
    try {
        const users = loadUsers();
        let max = 0; // start point so first id will be 1
        for (const u of users) {
            const idNum = Number(u.id);
            if (!Number.isNaN(idNum) && idNum > max) max = idNum;
        }
        return max + 1;
    } catch (e) {
        return 1;
    }
}

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

// Seed users function
function seed_users() {
    const users = [
        // ICT Department
        {"full_name": "Stevaniah Kavela", "username": "stevaniah", "email": "stevaniah@maishabank.com", "role": "ICT", "department": "ICT"},
        {"full_name": "Mercy Mukhwana", "username": "mercy", "email": "mercy@maishabank.com", "role": "ICT", "department": "ICT"},
        {"full_name": "Eric Mokaya", "username": "eric", "email": "eric@maishabank.com", "role": "ICT", "department": "ICT"},
        
        // Branch Department
        {"full_name": "Caroline Ngugi", "username": "caroline", "email": "caroline@maishabank.com", "role": "Operations", "department": "Branch"},
        {"full_name": "Lilian Kimani", "username": "lilian", "email": "lilian@maishabank.com", "role": "Operations", "department": "Branch"},
        {"full_name": "Maureen Kerubo", "username": "maureen", "email": "maureen@maishabank.com", "role": "Operations", "department": "Branch"},
        {"full_name": "Alice Muthoni", "username": "alice", "email": "alice@maishabank.com", "role": "Operations", "department": "Branch"},
        {"full_name": "Michael Mureithi", "username": "michael", "email": "michael@maishabank.com", "role": "Operations", "department": "Branch"},

        // Finance Department
        {"full_name": "Patrick Ndegwa", "username": "patrick", "email": "patrick@maishabank.com", "role": "Finance Officer", "department": "Finance"},
        {"full_name": "Margaret Njeri", "username": "margaret", "email": "margaret@maishabank.com", "role": "Finance Officer", "department": "Finance"},
        {"full_name": "Elizabeth Mungai", "username": "elizabeth", "email": "elizabeth@maishabank.com", "role": "Finance Officer", "department": "Finance"},

        // Customer Service
        {"full_name": "Ebby Gesare", "username": "ebby", "email": "ebby@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Vivian Orisa", "username": "vivian", "email": "vivian@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Juliana Jeptoo", "username": "juliana", "email": "juliana@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Faith Bonareri", "username": "faith", "email": "faith@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Patience Mutunga", "username": "patience", "email": "patience@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Eva Mukami", "username": "eva", "email": "eva@maishabank.com", "role": "Customer Service", "department": "Customer Service"},
        {"full_name": "Peter Kariuki", "username": "peter", "email": "peter@maishabank.com", "role": "Customer Service", "department": "Customer Service"},

        // Admin
        {"full_name": "Admin", "username": "admin", "email": "admin@maishabank.com", "role": "Admin", "department": "Admin"}
    ];

    const existingUsers = loadUsers();
    const existingUsernames = new Set(existingUsers.map(u => u.username));
    
    let addedCount = 0;
    const defaultPassword = "Password123!";
    const hashedPassword = hashPassword(defaultPassword);

    for (const userData of users) {
        // Ensure email follows first.last@maishabank.com
        const parts = (userData.full_name || '').trim().toLowerCase().split(/\s+/);
        const emailLocal = parts.join('.');
        userData.email = `${emailLocal}@maishabank.com`;

        // Check if user already exists
        if (!existingUsernames.has(userData.username)) {
            const newId = getNextUserId();
            const userObj = {
                id: newId,
                ...userData,
                password: hashedPassword,
                created_at: new Date().toISOString(),
                active: true
            };
            existingUsers.push(userObj);
            addedCount++;
            console.log('[SEED] Added user:', userData.username, 'id=', newId);
        } else {
            console.log('[SKIP] User already exists:', userData.username);
        }
    }

    if (addedCount > 0) {
        saveUsers(existingUsers);
        // ensure asset register entries exist for seeded users
        syncAssetsWithUsers(existingUsers);
        console.log('[SEED] Successfully added', addedCount, 'new users');
    } else {
        console.log('[SEED] No new users to add');
    }

    return { success: true, added: addedCount, total: existingUsers.length };
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

// ===== USER MANAGEMENT ENDPOINTS =====

// Seed users
app.post('/api/seed-users', (req, res) => {
    try {
        console.log('[SEED] Starting user seeding');
        const result = seed_users();
        res.json({
            success: true,
            message: `Seeding complete: ${result.added} users added, ${result.total} total users`,
            ...result
        });
    } catch (error) {
        console.error('[ERROR] Seeding users:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to seed users',
            error: error.message
        });
    }
});

// Get all users
app.get('/api/users', (req, res) => {
    try {
        console.log('[GET] Fetching users');
        const users = loadUsers();
        // Don't send passwords to frontend
        const safeUsers = users.map(u => ({
            id: u.id,
            full_name: u.full_name,
            username: u.username,
            email: u.email,
            role: u.role,
            department: u.department,
            active: u.active,
            created_at: u.created_at
        }));
        res.json({
            success: true,
            users: safeUsers
        });
    } catch (error) {
        console.error('[ERROR] Getting users:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

// Create/update user
app.post('/api/users', (req, res) => {
    try {
        const { id, full_name, username, email, role, department, password } = req.body;
        console.log('[POST] Creating/updating user:', username);
        
        const users = loadUsers();
        const userId = id ? Number(id) : undefined;
        
        // Check for duplicate username (if new user)
        if (!userId && users.some(u => u.username === username)) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Check for duplicate email (if new user)
        if (!userId && users.some(u => u.email === email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const existingUser = users.find(u => Number(u.id) === userId);
        const userObj = {
            id: userId || getNextUserId(),
            full_name,
            username,
            email,
            role,
            department,
            password: password ? hashPassword(password) : (existingUser?.password || hashPassword("Password123!")),
            active: true,
            created_at: existingUser?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (userId) {
            // Update existing user
            const index = users.findIndex(u => Number(u.id) === userId);
            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            users[index] = userObj;
            console.log('[UPDATE] Updated user:', username);
        } else {
            // Create new user
            users.push(userObj);
            console.log('[CREATE] Created user:', username, 'id=', userObj.id);
        }

        saveUsers(users);
        // synchronize asset register with updated users
        syncAssetsWithUsers(users);
        
        res.json({
            success: true,
            user: {
                id: userObj.id,
                full_name: userObj.full_name,
                username: userObj.username,
                email: userObj.email,
                role: userObj.role,
                department: userObj.department
            },
            message: id ? 'User updated successfully' : 'User created successfully'
        });
    } catch (error) {
        console.error('[ERROR] Creating/updating user:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to save user',
            error: error.message
        });
    }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    try {
        const userId = req.params.id;
        console.log('[DELETE] Deleting user:', userId);
        
        const users = loadUsers();
        const idNum = Number(userId);
        const index = users.findIndex(u => Number(u.id) === idNum);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const deletedUser = users.splice(index, 1)[0];
        saveUsers(users);
        
        console.log('[SUCCESS] User deleted:', deletedUser.username);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('[ERROR] Deleting user:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// Authenticate user (email + password)
app.post('/api/auth', (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

        const users = loadUsers();
        const user = users.find(u => (u.email || '').toLowerCase() === String(email).toLowerCase());
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const hashed = hashPassword(password);
        if (user.password !== hashed) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        // return safe user object
        const safe = {
            id: user.id,
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            role: user.role,
            department: user.department
        };

        return res.json({ success: true, user: safe });
    } catch (error) {
        console.error('[ERROR] Authenticating user:', error.message);
        res.status(500).json({ success: false, message: 'Authentication failed' });
    }
});

// Reset passwords for all users (admin endpoint)
app.post('/api/reset-passwords', (req, res) => {
    try {
        const { password } = req.body || {};
        if (!password || String(password).trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Password is required' });
        }

        console.log('[ADMIN] Resetting passwords for all users');
        const users = loadUsers();
        const hashed = hashPassword(String(password));

        const updated = users.map(u => ({
            ...u,
            password: hashed,
            updated_at: new Date().toISOString()
        }));

        saveUsers(updated);
        // Keep asset register in sync
        syncAssetsWithUsers(updated);

        console.log('[ADMIN] Passwords reset for', updated.length, 'users');
        return res.json({ success: true, updated: updated.length, message: 'Passwords updated' });
    } catch (error) {
        console.error('[ERROR] Resetting passwords:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to reset passwords' });
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
