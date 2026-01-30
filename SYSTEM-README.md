# Onit Microfinance Bank - Portal System

## Overview
A simplified, two-portal system for managing tickets and leave requests.

## Features

### Portals
- **User Portal**: Regular employees can submit tickets and manage leave requests
- **Admin Portal**: Administrators can manage all tickets and leave requests

### Core Modules
1. **Ticketing System**: Submit and track support tickets
2. **Leave Management**: Request and manage leave balances

## Getting Started

### Login
1. Open `index.html` in your browser
2. Choose between "User Portal" or "Admin Portal"
3. Select a user/admin from the dropdown
4. Password: `1234` (for all users)

### Users
**Regular Users:**
- John Smith (john.smith@onit.com)
- Jane Doe (jane.doe@onit.com)
- Michael Johnson (michael.johnson@onit.com)
- Sarah Williams (sarah.williams@onit.com)
- David Brown (david.brown@onit.com)

**Admins:**
- Admin One (admin1@onit.com)
- Admin Two (admin2@onit.com)
- System Admin (sysadmin@onit.com)

## File Structure

```
├── index.html              # Login page with portal selection
├── system.html             # User/Admin dashboard (Tickets & Leave)
├── admin.html              # Admin management panel
├── tickets.html            # Ticket viewing page
├── leave-management.html   # Leave management page
├── submit.html             # Ticket submission page
└── script.js               # Core JavaScript functionality
```

## Features

### User Portal
- View personal tickets
- Submit new tickets
- View leave balance
- Request leave
- Track leave requests

### Admin Portal
- View all tickets from all users
- Update ticket status (Open → In Progress → Resolved → Closed)
- Approve/Reject leave requests
- System statistics and analytics

### Tickets
- **Status**: Open, In Progress, Resolved, Closed
- **Priority**: Low, Medium, High, Critical
- **Type**: Request, Issue, Bug, Other

### Leave Types
- Annual Leave (20 days)
- Sick Leave (10 days)
- Personal Leave (5 days)

## Data Storage
All data is stored in browser localStorage:
- `employees`: User database
- `tickets`: All submitted tickets
- `leaveRequests`: All leave requests
- `userId`, `userName`, `userEmail`, `isAdmin`: Current user info

## Password
All accounts use the same password: `1234`

## Notes
- This is a simplified client-side system using localStorage
- No backend server is required
- All data is stored locally in the browser
