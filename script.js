// script.js

// Initialize SQLite database
let db;
const initDb = () => {
    if (window.SQL) {
        db = new window.SQL.Database();
        const dbData = localStorage.getItem('db');
        if (dbData) {
            db = new window.SQL.Database(new Uint8Array(JSON.parse(dbData)));
        }
        // Check if table exists and has correct schema
        let needsRecreate = false;
        try {
            const result = db.exec("PRAGMA table_info(tickets)");
            if (result.length > 0) {
                const columns = result[0].values.length;
                if (columns < 16) {
                    needsRecreate = true;
                }
            } else {
                needsRecreate = true;
            }
        } catch (e) {
            needsRecreate = true;
        }
        
        if (needsRecreate) {
            db.run("DROP TABLE IF EXISTS tickets");
            db.run("CREATE TABLE tickets (id TEXT PRIMARY KEY, name TEXT, email TEXT, fromDept TEXT, ticketType TEXT, toDept TEXT, issueType TEXT, description TEXT, status TEXT, priority TEXT, escalated TEXT, attachment TEXT, timestamp TEXT, category TEXT DEFAULT 'Request', sla_due TEXT, assigned_to TEXT)");
        }
    } else {
        console.warn('SQL.js not loaded, using localStorage fallback');
    }
};

// Function to generate ticket ID
function generateTicketId() {
    return 'TICK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

initDb();

// SLA Configuration
const SLA_CONFIG = {
    'P1': 1 * 60 * 60 * 1000, // 1 hour
    'P2': 4 * 60 * 60 * 1000, // 4 hours
    'P3': 24 * 60 * 60 * 1000, // 24 hours
    'P4': 72 * 60 * 60 * 1000  // 72 hours
};

// Calculate SLA due date
function calculateSLADue(priority, timestamp) {
    const slaMs = SLA_CONFIG[priority] || SLA_CONFIG['P4'];
    return new Date(new Date(timestamp).getTime() + slaMs).toISOString();
}

// Get SLA status
function getSLAStatus(ticket) {
    if (!ticket.sla_due) return { status: 'unknown', timeLeft: 0 };
    const now = new Date();
    const due = new Date(ticket.sla_due);
    const diff = due - now;
    if (diff < 0) return { status: 'breach', timeLeft: Math.abs(diff) };
    if (diff < 60 * 60 * 1000) return { status: 'warning', timeLeft: diff }; // < 1 hour
    return { status: 'good', timeLeft: diff };
}

// Format time remaining
function formatTimeRemaining(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// ===== RBAC: Department -> Module Roles =====
// Modules: ticketing, finance, audit, reporting, config, inventory, purchases, users, iam, pam, security-incident, vulnerability, policy-compliance, security-dashboard, data-integration, data-warehouse, analytics-bi, data-governance, leave-management, password-reset
const RBAC = {
    'IT': { ticketing: 'owner', finance: 'none', audit: 'none', reporting: 'full', config: 'full', inventory: 'owner', purchases: 'none', users: 'full', 'leave-management': 'user', 'password-reset': 'owner' },
    'IT / ICT': { ticketing: 'owner', finance: 'none', audit: 'none', reporting: 'full', config: 'full', inventory: 'owner', purchases: 'none', users: 'full', 'leave-management': 'user', 'password-reset': 'owner' },
    'Finance': { ticketing: 'user', finance: 'owner', audit: 'none', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'user' },
    'Operations': { ticketing: 'user', finance: 'none', audit: 'none', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'user' },
    'Risk & Compliance': { ticketing: 'read', finance: 'none', audit: 'owner', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'user' },
    'Internal Audit': { ticketing: 'read', finance: 'read', audit: 'full', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'user' },
    'Customer Service': { ticketing: 'user', finance: 'none', audit: 'none', reporting: 'limited', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'user' },
    'Management': { ticketing: 'read', finance: 'read', audit: 'read', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'leave-management': 'owner' },
    'Security': { ticketing: 'read', finance: 'none', audit: 'read', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', iam: 'owner', pam: 'owner', 'security-incident': 'owner', vulnerability: 'owner', 'policy-compliance': 'owner', 'security-dashboard': 'full', 'leave-management': 'user' },
    'Data Analysis': { ticketing: 'read', finance: 'read', audit: 'read', reporting: 'full', config: 'none', inventory: 'none', purchases: 'none', 'data-integration': 'owner', 'data-warehouse': 'owner', 'analytics-bi': 'owner', 'data-governance': 'owner', 'leave-management': 'user' },
    'Customer': { ticketing: 'user' },
    'admin': { ticketing: 'owner', finance: 'owner', audit: 'full', reporting: 'full', config: 'full', inventory: 'full', purchases: 'full', 'leave-management': 'owner', 'password-reset': 'owner' }
};

function getDeptKey(dept) {
    if (!dept) return 'none';
    if (RBAC[dept]) return dept;
    // normalize some common values
    const d = dept.toLowerCase();
    if (d.includes('it')) return 'IT';
    if (d.includes('finance')) return 'Finance';
    if (d.includes('operations')) return 'Operations';
    if (d.includes('risk')) return 'Risk & Compliance';
    if (d.includes('audit')) return 'Internal Audit';
    if (d.includes('branch') || d.includes('support') || d.includes('customer')) return 'Customer Service';
    if (d.includes('management')) return 'Management';
    if (d.includes('security')) return 'Security';
    if (d.includes('data') && d.includes('analysis')) return 'Data Analysis';
    if (d === 'admin') return 'admin';
    return dept;
}

function hasModuleAccess(moduleName, requiredLevel='read'){
    const deptRaw = localStorage.getItem('userDept');
    const dept = getDeptKey(deptRaw);
    // 'users', 'admin', 'purchases' modules have restricted access
    if (moduleName === 'users' || moduleName === 'admin' || moduleName === 'purchases') {
        return dept === 'admin' || dept === 'IT' || dept === 'IT / ICT';
    }

    const role = (RBAC[dept] && RBAC[dept][moduleName]) || 'none';

    const order = { 'none':0, 'limited':1, 'read':2, 'user':3, 'owner':4, 'full':5 };
    return order[role] >= order[requiredLevel];
}

// Function to save db to localStorage
function saveDbToStorage() {
    if (db) {
        localStorage.setItem('db', JSON.stringify(Array.from(db.export())));
    }
}

// Function to auto-assign department based on issue type
function autoAssignDepartment(issueType) {
    const assignments = {
        'account': 'Finance',
        'transaction': 'Finance',
        'security': 'Security',
        'loan': 'Finance',
        'IT Support': 'IT',
        'HR Issues': 'Customer Service',
        'Facilities': 'Operations',
        'Internal Process': 'Operations',
        'other': 'Customer Service'
    };
    return assignments[issueType] || 'Customer Service';
}

// Function to get issue types based on user type
function getIssueTypes(isInternal) {
    if (isInternal) {
        return [
            { value: 'IT Support', text: 'IT Support' },
            { value: 'HR Issues', text: 'HR Issues' },
            { value: 'Facilities', text: 'Facilities' },
            { value: 'Internal Process', text: 'Internal Process' },
            { value: 'other', text: 'Other' }
        ];
    } else {
        return [
            { value: 'account', text: 'How do I check my account balance?' },
            { value: 'transaction', text: 'How do I transfer money between accounts?' },
            { value: 'security', text: 'What should I do if I suspect fraudulent activity?' },
            { value: 'loan', text: 'How do I apply for a loan?' },
            { value: 'other', text: 'Other' }
        ];
    }
}

// Function to populate issue types
function populateIssueTypes(isInternal) {
    const issueTypeSelect = document.getElementById('issueType');
    issueTypeSelect.innerHTML = '<option value="" class="text-gray-900">Select an issue</option>';
    const options = getIssueTypes(isInternal);
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        opt.className = 'text-gray-900';
        issueTypeSelect.appendChild(opt);
    });
}

// Function to update UI based on user type
function updateUIForUserType(fromDept) {
    const isInternal = fromDept && fromDept !== 'Customer';
    populateIssueTypes(isInternal);
}

// Function to update a ticket
function updateTicket(id, updates) {
    // Update via API
    fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Ticket updated successfully');
            // Refresh the display if we're on a tickets page
            if (document.getElementById('ticketsContainer')) {
                displayTickets();
            } else if (document.getElementById('adminTicketsContainer')) {
                displayAdminTickets();
            }
        } else {
            console.error('Failed to update ticket:', data.message);
        }
    })
    .catch(error => {
        console.error('Error updating ticket:', error);
        // Fallback to local update
        if (db) {
            const setParts = [];
            const values = [];
            for (const key in updates) {
                setParts.push(`${key} = ?`);
                values.push(updates[key]);
            }
            values.push(id);
            db.run(`UPDATE tickets SET ${setParts.join(', ')} WHERE id = ?`, values);
            saveDbToStorage();
        } else {
            // Fallback
            const tickets = getTickets();
            const index = tickets.findIndex(t => t.id === id);
            if (index !== -1) {
                tickets[index] = { ...tickets[index], ...updates };
                localStorage.setItem('tickets', JSON.stringify(tickets));
            }
        }
    });
    logAudit('Update Ticket', id, localStorage.getItem('userDept') || 'Unknown');
}

// Function to save ticket to database
function saveTicket(ticket) {
    if (db) {
        db.run("INSERT INTO tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            ticket.id, ticket.name, ticket.email, ticket.fromDept, ticket.ticketType, ticket.toDept, 
            ticket.issueType, ticket.description, ticket.status, ticket.priority, ticket.escalated, 
            ticket.attachment, ticket.timestamp, ticket.category || 'Request', ticket.sla_due || null, ticket.assigned_to || null
        ]);
        saveDbToStorage();
    } else {
        // Fallback
        const tickets = getTickets();
        tickets.push(ticket);
        localStorage.setItem('tickets', JSON.stringify(tickets));
    }
    logAudit('Create Ticket', ticket.id, ticket.fromDept);
}

// Function to get tickets from database
function getTickets() {
    if (db) {
        const result = db.exec("SELECT * FROM tickets");
        if (result.length > 0) {
            const rows = result[0].values;
            const columns = result[0].columns;
            return rows.map(row => {
                const ticket = {};
                columns.forEach((col, i) => ticket[col] = row[i]);
                return ticket;
            });
        }
        return [];
    } else {
        // Fallback
        const tickets = localStorage.getItem('tickets');
        return tickets ? JSON.parse(tickets) : [];
    }
}

// Function to display tickets for admin
function displayAdminTickets() {
    const container = document.getElementById('adminTicketsContainer');
    const noTickets = document.getElementById('noTicketsAdmin');
    
    // Fetch tickets from API
    fetch('/api/tickets')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tickets = data.tickets;

                if (tickets.length === 0) {
                    noTickets.style.display = 'block';
                    container.innerHTML = '';
                    return;
                }

                noTickets.style.display = 'none';
                container.innerHTML = tickets.map(ticket => {
                    let statusClass = '';
                    if (ticket.status === 'Open') statusClass = 'text-blue-600';
                    else if (ticket.status === 'In Progress') statusClass = 'text-amber-600';
                    else if (ticket.status === 'Closed') statusClass = 'text-gray-600';
                    return `
                    <div class="bg-white p-6 rounded-lg shadow-md ${ticket.escalated === 'Yes' ? 'border-l-4 border-red-500' : ''}">
                        <h3 class="text-xl font-bold mb-2 text-gray-900">Ticket ID: ${ticket.id} ${ticket.escalated === 'Yes' ? '<span class="text-red-500">(Escalated)</span>' : ''}</h3>
                        <p><strong>Name:</strong> ${ticket.name}</p>
                        <p><strong>Email:</strong> ${ticket.email}</p>
                        <p><strong>From:</strong> ${ticket.fromDept}</p>
                        <p><strong>Ticket Type:</strong> ${ticket.ticketType}</p>
                        <p><strong>Issue Type:</strong> ${ticket.issueType}</p>
                        <p><strong>Description:</strong> ${ticket.description}</p>
                        <p><strong>Priority:</strong> ${ticket.priority}</p>
                        ${ticket.attachment ? `<p><strong>Attachments:</strong> ${ticket.attachment}</p>` : ''}
                        <p><strong>Status:</strong> 
                            <select class="status-select bg-white border border-gray-300 rounded-md text-gray-900 px-2 py-1 ${statusClass}" data-id="${ticket.id}">
                                <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Open</option>
                                <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Closed" ${ticket.status === 'Closed' ? 'selected' : ''}>Closed</option>
                            </select>
                        </p>
                        <p><strong>Assigned To:</strong> 
                            <select class="dept-select bg-white border border-gray-300 rounded-md text-gray-900 px-2 py-1" data-id="${ticket.id}">
                                <option value="Customer Service" ${ticket.toDept === 'Customer Service' ? 'selected' : ''}>Customer Service</option>
                                <option value="IT" ${ticket.toDept === 'IT' ? 'selected' : ''}>IT</option>
                                <option value="Finance" ${ticket.toDept === 'Finance' ? 'selected' : ''}>Finance</option>
                                <option value="Security" ${ticket.toDept === 'Security' ? 'selected' : ''}>Security</option>
                                <option value="Operations" ${ticket.toDept === 'Operations' ? 'selected' : ''}>Operations</option>
                                <option value="Risk & Compliance" ${ticket.toDept === 'Risk & Compliance' ? 'selected' : ''}>Risk & Compliance</option>
                                <option value="Internal Audit" ${ticket.toDept === 'Internal Audit' ? 'selected' : ''}>Internal Audit</option>
                                <option value="Management" ${ticket.toDept === 'Management' ? 'selected' : ''}>Management</option>
                                <option value="Data Analysis" ${ticket.toDept === 'Data Analysis' ? 'selected' : ''}>Data Analysis</option>
                            </select>
                        </p>
                        <p><strong>Submitted:</strong> ${new Date(ticket.timestamp).toLocaleString()}</p>
                    </div>
                `}).join('');

                // Add event listeners for changes
                document.querySelectorAll('.status-select').forEach(select => {
                    select.addEventListener('change', function() {
                        const id = this.getAttribute('data-id');
                        updateTicket(id, { status: this.value });
                    });
                });

                document.querySelectorAll('.dept-select').forEach(select => {
                    select.addEventListener('change', function() {
                        const id = this.getAttribute('data-id');
                        updateTicket(id, { toDept: this.value });
                    });
                });
            } else {
                console.error('Failed to load tickets:', data.message);
                if (container) container.innerHTML = '<div class="text-gray-900">Failed to load tickets</div>';
            }
        })
        .catch(error => {
            console.error('Error loading tickets:', error);
            if (container) container.innerHTML = '<div class="text-gray-900">Error loading tickets</div>';
        });
}

// Handle form submission
if (document.getElementById('ticketForm')) {
    // Handle user type selection
    document.getElementById('customerBtn').addEventListener('click', function() {
        document.getElementById('fromDept').value = 'Customer';
        document.getElementById('userTypeSelection').classList.add('hidden');
        document.getElementById('ticketFormContainer').classList.remove('hidden');
        updateUIForUserType('Customer');
    });

    document.getElementById('internalBtn').addEventListener('click', function() {
        document.getElementById('deptSelection').classList.remove('hidden');
    });

    document.getElementById('proceedBtn').addEventListener('click', function() {
        const selectedDept = document.getElementById('fromDeptSelect').value;
        document.getElementById('fromDept').value = selectedDept;
        document.getElementById('userTypeSelection').classList.add('hidden');
        document.getElementById('deptSelection').classList.add('hidden');
        document.getElementById('ticketFormContainer').classList.remove('hidden');
        updateUIForUserType(selectedDept);
    });

    // Show/hide To Department based on Ticket Type
    document.getElementById('ticketType').addEventListener('change', function() {
        // Always show toDept now
    });

    document.getElementById('ticketForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        let fromDept = document.getElementById('fromDept').value;
        const ticketType = document.getElementById('ticketType').value;
        let toDept = document.getElementById('toDept').value;
        const issueType = document.getElementById('issueType').value;
        const description = document.getElementById('description').value;
        const attachmentInput = document.getElementById('attachment');
        const attachment = attachmentInput.files.length > 0 ? Array.from(attachmentInput.files).map(f => f.name).join(', ') : '';
        const priority = document.getElementById('priority').value;

        if (!fromDept) fromDept = 'Customer';

        // Auto-assign toDept if not set
        if (!toDept) {
            if (ticketType === 'Request' && fromDept === 'Customer Service') {
                // For Customer Service requests, toDept should be selected, but if not, default
                toDept = autoAssignDepartment(issueType);
            } else {
                toDept = autoAssignDepartment(issueType);
            }
        }

        const ticket = {
            id: generateTicketId(),
            name,
            email,
            fromDept,
            ticketType,
            toDept,
            issueType,
            description,
            status: 'Open',
            priority,
            escalated: 'No',
            attachment,
            timestamp: new Date().toISOString()
        };

        saveTicket(ticket);

        alert('Ticket submitted successfully! ID: ' + ticket.id + ' - Assigned to: ' + toDept);
        document.getElementById('ticketForm').reset();
        document.getElementById('toDeptContainer').style.display = 'none';

        // Reset to initial state
        setTimeout(() => {
            document.getElementById('ticketFormContainer').classList.add('hidden');
            document.getElementById('userTypeSelection').classList.remove('hidden');
            document.getElementById('deptSelection').classList.add('hidden');
        }, 3000);

        // Simulate automated response
        setTimeout(() => {
            alert('Automated Response: Thank you for submitting your ticket. It has been automatically assigned to ' + toDept + ' and our system has provided an initial response.');
        }, 1000);
    });
}

// Function to download CSV
function downloadCSV() {
    // Fetch tickets from API
    fetch('/api/tickets')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tickets = data.tickets;
                if (tickets.length === 0) {
                    alert('No tickets to export.');
                    return;
                }

                const headers = ['ID', 'Name', 'Email', 'From Department', 'Ticket Type', 'To Department', 'Issue Type', 'Description', 'Status', 'Priority', 'Escalated', 'Attachment', 'Timestamp'];
                const csvContent = [
                    headers.join(','),
                    ...tickets.map(ticket => [
                        ticket.id,
                        `"${ticket.name}"`,
                        `"${ticket.email}"`,
                        `"${ticket.fromDept}"`,
                        `"${ticket.ticketType}"`,
                        `"${ticket.toDept}"`,
                        `"${ticket.issueType}"`,
                        `"${ticket.description.replace(/"/g, '""')}"`,
                        `"${ticket.status}"`,
                        `"${ticket.priority}"`,
                        `"${ticket.escalated}"`,
                        `"${ticket.attachment}"`,
                        `"${ticket.timestamp}"`
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tickets_report.csv';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert('Failed to load tickets for export.');
            }
        })
        .catch(error => {
            console.error('Error loading tickets for export:', error);
            alert('Error loading tickets for export.');
        });
}

// Function to display tickets for users (filtered by department)
function displayTickets(searchTerm = '', statusFilter = '', priorityFilter = '', categoryFilter = '') {
    const container = document.getElementById('ticketsContainer');
    const noTickets = document.getElementById('noTickets');
    
    const isDark = document.body.classList.contains('dark-theme');
    
    // Fetch tickets from API
    fetch('/api/tickets')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tickets = data.tickets;
                const userDept = localStorage.getItem('userDept');
                
                // Enforce RBAC for ticketing
                if (!hasModuleAccess('ticketing','read')) {
                    if (container) container.innerHTML = '<div class="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center"><i class="fas fa-lock text-4xl text-white/50 mb-4"></i><p class="text-white">Access Denied</p></div>';
                    if (noTickets) noTickets.style.display = 'none';
                    return;
                }

                let filteredTickets;
                const deptKey = getDeptKey(userDept);
                const role = (RBAC[deptKey] && RBAC[deptKey].ticketing) || 'none';
                if (deptKey === 'admin' || role === 'owner' || role === 'full') {
                    filteredTickets = tickets;
                } else if (role === 'user') {
                    filteredTickets = tickets.filter(ticket => ticket.toDept === userDept || ticket.fromDept === userDept);
                } else if (role === 'read' || role === 'limited') {
                    filteredTickets = role === 'read' ? tickets : tickets.filter(ticket => ticket.toDept === userDept);
                } else {
                    filteredTickets = [];
                }

                // Apply filters
                if (searchTerm) {
                    filteredTickets = filteredTickets.filter(ticket =>
                        ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                if (statusFilter) {
                    filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
                }
                if (priorityFilter) {
                    filteredTickets = filteredTickets.filter(ticket => ticket.priority === priorityFilter);
                }
                if (categoryFilter) {
                    filteredTickets = filteredTickets.filter(ticket => ticket.category === categoryFilter);
                }

                // Update stats
                updateTicketStats(filteredTickets);

                if (filteredTickets.length === 0) {
                    noTickets.style.display = 'block';
                    container.innerHTML = '';
                    return;
                }

                noTickets.style.display = 'none';
                container.innerHTML = filteredTickets
                    .sort((a, b) => {
                        // Sort by priority (P1 first) then by timestamp (newest first)
                        const priorityOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 };
                        const aPriority = priorityOrder[a.priority] || 4;
                        const bPriority = priorityOrder[b.priority] || 4;
                        if (aPriority !== bPriority) return aPriority - bPriority;
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    })
                    .map(ticket => {
                        const sla = getSLAStatus(ticket);
                        const priorityClass = `priority-${ticket.priority}`;
                        const slaClass = sla.status === 'breach' ? 'sla-breach' : sla.status === 'warning' ? 'sla-warning' : 'sla-good';
                        const statusColor = ticket.status === 'Open' ? (isDark ? 'text-blue-400' : 'text-blue-600') : ticket.status === 'In Progress' ? (isDark ? 'text-yellow-400' : 'text-yellow-600') : (isDark ? 'text-green-400' : 'text-green-600');

                        const cardBg = isDark ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white border border-gray-200 shadow-md';
                        const iconBg = isDark ? 'bg-white/20' : 'bg-gray-100';
                        const iconColor = isDark ? 'text-white' : 'text-gray-600';
                        const titleColor = isDark ? 'text-white' : 'text-gray-900';
                        const subtitleColor = isDark ? 'text-white/70' : 'text-gray-500';
                        const bodyColor = isDark ? 'text-white/80' : 'text-gray-700';
                        const labelColor = isDark ? 'text-white/70' : 'text-gray-500';
                        const valueColor = isDark ? 'text-white' : 'text-gray-900';
                        const buttonBg = isDark ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700';

                        return `
                        <div class="ticket-card ${cardBg} rounded-xl p-6">
                            <div class="flex items-start justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center">
                                        <i class="fas fa-ticket-alt ${iconColor}"></i>
                                    </div>
                                    <div>
                                        <h3 class="${titleColor} font-bold text-lg">${ticket.id}</h3>
                                        <p class="${subtitleColor} text-sm">${ticket.category || 'Request'}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="priority-badge ${priorityClass}">${ticket.priority}</span>
                                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor} ${isDark ? 'bg-white/20' : 'bg-gray-100'}">${ticket.status}</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p class="${labelColor} text-sm">From</p>
                                    <p class="${valueColor}">${ticket.name} (${ticket.fromDept || 'Customer'})</p>
                                </div>
                                <div>
                                    <p class="${labelColor} text-sm">Assigned To</p>
                                    <p class="${valueColor}">${ticket.toDept}</p>
                                </div>
                            </div>

                            <p class="${bodyColor} mb-4 line-clamp-2">${ticket.description}</p>

                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4">
                                    <div class="sla-timer ${slaClass}">
                                        <i class="fas fa-clock mr-1"></i>
                                        ${sla.status === 'breach' ? 'SLA Breached' : sla.status === 'warning' ? `Due in ${formatTimeRemaining(sla.timeLeft)}` : `Due in ${formatTimeRemaining(sla.timeLeft)}`}
                                    </div>
                                    ${ticket.escalated === 'Yes' ? `<span class="${isDark ? 'text-red-400' : 'text-red-600'}"><i class="fas fa-exclamation-triangle mr-1"></i>Escalated</span>` : ''}
                                </div>
                                ${isDark ? `<button onclick="showQuickActions('${ticket.id}')" class="${buttonBg} px-3 py-1 rounded-lg transition">
                                    <i class="fas fa-ellipsis-h"></i>
                                </button>` : ''}
                            </div>
                        </div>
                    `}).join('');
            } else {
                console.error('Failed to load tickets:', data.message);
                if (container) container.innerHTML = `<div class="${isDark ? 'text-white' : 'text-gray-900'}">Failed to load tickets</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading tickets:', error);
            if (container) container.innerHTML = `<div class="${isDark ? 'text-white' : 'text-gray-900'}">Error loading tickets</div>`;
        });
}

// Update ticket statistics
function updateTicketStats(tickets) {
    const totalEl = document.getElementById('totalTickets');
    const openEl = document.getElementById('openTickets');
    const inProgressEl = document.getElementById('inProgressTickets');
    const closedEl = document.getElementById('closedTickets');
    
    if (!totalEl) return; // Not on tickets page
    
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const closed = tickets.filter(t => t.status === 'Closed').length;

    totalEl.textContent = total;
    openEl.textContent = open;
    inProgressEl.textContent = inProgress;
    closedEl.textContent = closed;
}

// Filter tickets
function filterTickets() {
    const searchTerm = document.getElementById('searchInput').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    displayTickets(searchTerm, statusFilter, priorityFilter, categoryFilter);
}

// Show quick actions modal
function showQuickActions(ticketId) {
    const modal = document.getElementById('quickActionsModal');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');

    title.textContent = `Actions for ${ticketId}`;
    content.innerHTML = `
        <div class="space-y-2">
            <button onclick="updateTicketStatus('${ticketId}', 'In Progress')" class="w-full text-left p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition">
                <i class="fas fa-play mr-2"></i>Start Working
            </button>
            <button onclick="updateTicketStatus('${ticketId}', 'Closed')" class="w-full text-left p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition">
                <i class="fas fa-check mr-2"></i>Close Ticket
            </button>
            <button onclick="escalateTicket('${ticketId}')" class="w-full text-left p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                <i class="fas fa-exclamation-triangle mr-2"></i>Escalate
            </button>
            <button onclick="assignTicket('${ticketId}')" class="w-full text-left p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition">
                <i class="fas fa-user mr-2"></i>Reassign
            </button>
        </div>
    `;

    modal.classList.remove('hidden');
}

// Update ticket status
function updateTicketStatus(ticketId, status) {
    updateTicket(ticketId, { status: status });
    document.getElementById('quickActionsModal').classList.add('hidden');
}
}

// Escalate ticket
function escalateTicket(ticketId) {
    updateTicket(ticketId, { escalated: 'Yes' });
    document.getElementById('quickActionsModal').classList.add('hidden');
}

// Assign ticket
function assignTicket(ticketId) {
    // For now, just log - could be expanded to show department selection
    console.log(`Reassigning ${ticketId}`);
    document.getElementById('quickActionsModal').classList.add('hidden');
}

// Function to log audit
function logAudit(action, ticketId, user) {
    const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
    logs.push({
        timestamp: new Date().toISOString(),
        action,
        ticketId,
        user
    });
    localStorage.setItem('auditLogs', JSON.stringify(logs));
}

// Call checkSLA on load
checkSLA();

// Hide unauthorized navigation links based on RBAC
function hideUnauthorizedNavLinks() {
    const mapping = {
        'index.html': null,
        'submit.html': 'ticketing',
        'tickets.html': 'ticketing',
        'finance.html': 'finance',
        'audit.html': 'audit',
        'reports.html': 'reporting',
        'config.html': 'config',
        'notifications.html': 'audit',
        'users.html': 'users',
        'iam.html': 'iam',
        'pam.html': 'pam',
        'security-incident.html': 'security-incident',
        'vulnerability.html': 'vulnerability',
        'policy-compliance.html': 'policy-compliance',
        'security-dashboard.html': 'security-dashboard',
        'data-integration.html': 'data-integration',
        'data-warehouse.html': 'data-warehouse',
        'analytics-bi.html': 'analytics-bi',
        'data-governance.html': 'data-governance',
        'leave-management.html': 'leave-management',
        'password-reset.html': 'password-reset'
    };

    const userDept = localStorage.getItem('userDept');

    // First, hide individual links the user shouldn't see
    const sidebar = document.getElementById('sidebar') || document;
    sidebar.querySelectorAll('a[href]').forEach(a => {
        try {
            const href = a.getAttribute('href').split('#')[0].split('?')[0];
            const file = href.split('/').pop();
            if (!file) return;

            // Special handling for users.html: only admin and IT allowed
            if (file === 'users.html') {
                const deptKey = getDeptKey(userDept);
                if (!userDept || (deptKey !== 'admin' && deptKey !== 'IT' && deptKey !== 'IT / ICT')) a.style.display = 'none';
                return;
            }

            const mod = mapping[file];
            if (!mod) return; // no RBAC required

            if (!hasModuleAccess(mod, 'read')) {
                a.style.display = 'none';
            }
        } catch (e) {
            // ignore
        }
    });

    // Then, hide entire nav sections if none of their visible links remain
    document.querySelectorAll('.nav-section').forEach(section => {
        const items = Array.from(section.querySelectorAll('.nav-item'));
        if (items.length === 0) return;
        const anyVisible = items.some(item => {
            // consider element visible if it is in the flow and not explicitly hidden
            const style = window.getComputedStyle(item);
            return style.display !== 'none' && style.visibility !== 'hidden' && item.offsetParent !== null;
        });
        if (!anyVisible) {
            section.style.display = 'none';
        }
    });
}

// Reveal elements annotated with `data-module` only when the user's department has access
function revealAllowedModules() {
    document.querySelectorAll('[data-module]').forEach(el => {
        try {
            const mod = el.getAttribute('data-module');
            if (!mod) return;
            if (hasModuleAccess(mod, 'read')) {
                // remove inline hiding (pages default to hidden via CSS)
                el.style.display = '';
            } else {
                // ensure hidden
                el.style.display = 'none';
            }
        } catch (e) {
            // ignore
        }
    });
}

// Prevent direct access to module pages by redirecting unauthorized users
function enforcePageAccess() {
    const mapping = {
        'finance.html': 'finance',
        'reports.html': 'reporting',
        'audit.html': 'audit',
        'config.html': 'config',
        'tickets.html': 'ticketing',
        'submit.html': 'ticketing',
        'users.html': 'users',
        'iam.html': 'iam',
        'pam.html': 'pam',
        'security-incident.html': 'security-incident',
        'vulnerability.html': 'vulnerability',
        'policy-compliance.html': 'policy-compliance',
        'security-dashboard.html': 'security-dashboard',
        'data-integration.html': 'data-integration',
        'data-warehouse.html': 'data-warehouse',
        'analytics-bi.html': 'analytics-bi',
        'data-governance.html': 'data-governance',
        'leave-management.html': 'leave-management',
        'password-reset.html': 'password-reset'
    };
    try {
        const href = window.location.pathname.split('/').pop();
        const mod = mapping[href];
        if (mod && !hasModuleAccess(mod, 'read')) {
            window.location.href = 'system.html';
        }
    } catch (e) {
        // ignore
    }
}

// Function to initialize employees data
function initializeEmployees() {
    let employees = JSON.parse(localStorage.getItem('employees') || '[]');
    if (employees.length === 0) {
        employees = [
            // IT Department
            { id: 'EMP001', name: 'Stevaniah Kavela', department: 'IT', email: 'stevaniah.kavela@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP002', name: 'Mercy Mukhwana', department: 'IT', email: 'mercy.mukhwana@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // IT / ICT Department
            { id: 'EMP003', name: 'Eric Mokaya', department: 'IT / ICT', email: 'eric.mokaya@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP004', name: 'Caroline Ngugi', department: 'IT / ICT', email: 'caroline.ngugi@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Finance Department
            { id: 'EMP005', name: 'Lilian Kimani', department: 'Finance', email: 'lilian.kimani@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP006', name: 'Maureen Kerubo', department: 'Finance', email: 'maureen.kerubo@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Operations Department
            { id: 'EMP007', name: 'Alice Muthoni', department: 'Operations', email: 'alice.muthoni@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP008', name: 'Michael Mureithi', department: 'Operations', email: 'michael.mureithi@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Risk & Compliance Department
            { id: 'EMP009', name: 'Patrick Ndegwa', department: 'Risk & Compliance', email: 'patrick.ndegwa@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP010', name: 'Margaret Njeri', department: 'Risk & Compliance', email: 'margaret.njeri@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Internal Audit Department
            { id: 'EMP011', name: 'Elizabeth Mungai', department: 'Internal Audit', email: 'elizabeth.mungai@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP012', name: 'Ebby Gesare', department: 'Internal Audit', email: 'ebby.gesare@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Customer Service Department
            { id: 'EMP013', name: 'Vivian Orisa', department: 'Customer Service', email: 'vivian.orisa@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP014', name: 'Juliana Jeptoo', department: 'Customer Service', email: 'juliana.jeptoo@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Management Department
            { id: 'EMP015', name: 'Faith Bonareri', department: 'Management', email: 'faith.bonareri@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP016', name: 'Patience Mutunga', department: 'Management', email: 'patience.mutunga@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Security Department
            { id: 'EMP017', name: 'Eva Mukami', department: 'Security', email: 'eva.mukami@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP018', name: 'Peter Kariuki', department: 'Security', email: 'peter.kariuki@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Data Analysis Department
            { id: 'EMP019', name: 'Ken Okwero', department: 'Data Analysis', email: 'ken.okwero@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },
            { id: 'EMP020', name: 'Bonface Kioko', department: 'Data Analysis', email: 'bonface.kioko@maishabank.com', leaveBalances: { annual: 25, sick: 10, personal: 5, maternity: 0, paternity: 0 } },

            // Admin
            { id: 'EMP021', name: 'Clive Odame', department: 'admin', email: 'clive.odame@maishabank.com', leaveBalances: { annual: 30, sick: 15, personal: 10, maternity: 0, paternity: 0 } }
        ];
        localStorage.setItem('employees', JSON.stringify(employees));
    }
}

// Initialize employees on page load
initializeEmployees();

document.addEventListener('DOMContentLoaded', function() {
    hideUnauthorizedNavLinks();
    revealAllowedModules();
    enforcePageAccess();

    // Logout functionality
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('userDept');
            window.location.href = 'index.html';
        });
    }
});