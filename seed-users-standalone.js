const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, 'users.json');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

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

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log('[SUCCESS] Saved', users.length, 'users');
    } catch (error) {
        console.error('[ERROR] Saving users:', error.message);
    }
}

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
        // Check if user already exists
        if (!existingUsernames.has(userData.username)) {
            const userObj = {
                id: crypto.randomBytes(8).toString('hex'),
                ...userData,
                password: hashedPassword,
                created_at: new Date().toISOString(),
                active: true
            };
            existingUsers.push(userObj);
            addedCount++;
            console.log('[SEED] Added user:', userData.username);
        } else {
            console.log('[SKIP] User already exists:', userData.username);
        }
    }

    if (addedCount > 0) {
        saveUsers(existingUsers);
        console.log('[SEED] Successfully added', addedCount, 'new users');
    } else {
        console.log('[SEED] No new users to add');
    }

    return { success: true, added: addedCount, total: existingUsers.length };
}

// Run the seed
console.log('Starting user seeding...');
const result = seed_users();
console.log('Result:', result);
console.log('Users file location:', USERS_FILE);
console.log('File exists:', fs.existsSync(USERS_FILE));
