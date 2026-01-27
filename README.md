# Onit Microfinance Bank Ticketing System

## Overview

A modern, enterprise-grade ticketing system for Onit Microfinance Bank with clean minimalist UI, role-based access control, SLA tracking, and automation features. Built with HTML, CSS (Tailwind), JavaScript, and SQLite for local persistence.

## Features

### 🎨 Modern UI & UX
- **Clean Minimalist Design**: Vertical ticket list with gradient backgrounds and glassmorphism effects
- **Responsive Design**: Optimized for desktop and mobile devices
- **Intuitive Navigation**: Streamlined user experience with smart defaults

### 👥 User Management
- **Role-Based Access Control (RBAC)**: Department-specific permissions and views
- **Auto-Fill Forms**: Smart field population based on user context
- **Multi-User Types**: Support for customers, internal users, and administrators

### 🎫 Advanced Ticketing
- **ITIL Categories**: Incident, Request, Problem, and Change management
- **Priority Levels**: P1-P4 with color-coded badges
- **SLA Tracking**: Automated SLA calculation and breach monitoring
- **File Attachments**: Support for multiple file uploads
- **Smart Assignment**: Auto-routing based on issue types

### ⚡ Automation & Intelligence
- **Auto-Assignment**: Intelligent routing to appropriate departments
- **SLA Management**: Real-time SLA timers with breach alerts
- **Escalation Rules**: Automated escalation for overdue tickets
- **Notifications**: Email notifications for status updates

### 📊 Analytics & Reporting
- **Manager Dashboard**: Comprehensive metrics and KPIs
- **Performance Tracking**: Resolution times, SLA compliance, volume trends
- **Department Analytics**: Performance insights by department
- **CSV Export**: Detailed reporting capabilities

### 🔒 Security & Compliance
- **Audit Logging**: Complete audit trail of all actions
- **Secure Storage**: Local SQLite database with encryption-ready design
- **Access Controls**: Granular permissions aligned with ITIL practices

## Database Schema

### Tickets Table
```sql
CREATE TABLE tickets (
    id TEXT PRIMARY KEY,           -- Unique ticket ID (e.g., TICK-1234567890-abc123)
    name TEXT NOT NULL,            -- Customer or submitter name
    email TEXT NOT NULL,           -- Email address
    fromDept TEXT,                 -- Department submitting the ticket
    ticketType TEXT NOT NULL,      -- Type: Query, Feedback, Request
    toDept TEXT NOT NULL,          -- Assigned department
    issueType TEXT NOT NULL,       -- Specific issue category
    description TEXT NOT NULL,     -- Detailed description
    status TEXT NOT NULL,          -- Status: Open, In Progress, Closed
    priority TEXT NOT NULL,        -- Priority: P1, P2, P3, P4
    escalated TEXT DEFAULT 'No',   -- Escalation status
    attachment TEXT,               -- File attachment names
    timestamp TEXT NOT NULL,       -- ISO timestamp of submission
    category TEXT DEFAULT 'Request', -- ITIL Category: Incident, Request, Problem, Change
    sla_due TEXT,                  -- SLA due timestamp
    assigned_to TEXT               -- Assigned agent (future use)
);
```

### Key Features & Logic
- **SLA Calculation**: Based on priority (P1: 1h, P2: 4h, P3: 24h, P4: 72h)
- **Auto-Assignment**: Rules-based routing to departments
- **Priority Sorting**: Tickets sorted by priority then recency
- **RBAC Enforcement**: Department-specific access controls

### Sample Data
| id | name | email | fromDept | ticketType | toDept | issueType | description | status | timestamp |
|----|------|-------|----------|------------|--------|-----------|-------------|--------|-----------|
| TICK-1642718400000-abc | John Doe | john@example.com | NULL | Query | Customer Service | other | How to reset password? | Open | 2026-01-21T00:00:00.000Z |
| TICK-1642718500000-def | Jane Smith | jane@bank.com | Customer Service | Request | IT | account | Need new account setup | In Progress | 2026-01-21T00:01:40.000Z |

## How to Use

1. Open `http://localhost:8000` to see the 3D welcome landing page.
2. Click "Login" to access the ticketing dashboard.
3. Navigate to "Submit Ticket" to create a new ticket.
4. View submitted tickets on "View Tickets" page.
5. Use "Admin" for ticket management and CSV reports.
6. Tickets are stored in SQLite and persist across sessions.

## Technologies Used

- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript

## Files

- `index.html`: Landing page with 3D welcome message and link to system.
- `system.html`: Main dashboard with navigation to ticket features.
- `submit.html`: Ticket submission form.
- `tickets.html`: Page to view submitted tickets.
- `admin.html`: Admin portal for managing tickets and downloading reports.
- `script.js`: JavaScript for form handling, ticket management, SQLite operations, and CSV export.
- `README.md`: This file.

## Running the Website

The website is served locally. Open `http://localhost:8000` to access the landing page with the 3D welcome message. Click "Login" to navigate to the ticketing dashboard.