# Cadence • Class Attendance Management System

A professional-grade, high-precision institutional Class Attendance Management System built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **Neon Cloud PostgreSQL Serverless**.

Designed with the **Impeccable Neo-Kinpaku** design philosophy: dark lacquer surfaces, gold and verdigris accents, crisp data density, zero "AI-slop" boilerplate, and keyboard-driven efficiency.

---

## Features

### 1. Interactive Live Roll Call Terminal
- **Keyboard-Driven Workflow**: Fast roll call using hotkeys:
  - <kbd>P</kbd> or <kbd>Space</kbd> : Present
  - <kbd>A</kbd> : Absent
  - <kbd>L</kbd> : Late
  - <kbd>E</kbd> : Excused
  - <kbd>↓</kbd> / <kbd>↑</kbd> : Navigate student roster
- **Bulk Operations**: One-click *Mark All Present*, *Reset Roll*, and *Finalize / Lock Session*.
- **Inline Remarks & Tags**: Add timestamped reasons (transit delay, medical note, hackathon).

### 2. Anti-Proxy Dynamic QR Attendance Check-in
- **Rotating Cryptographic QR Code**: Generates a secure QR code on classroom projector screens.
- **15-Second Token Refresh**: Automatic countdown rotation prevents students from taking photos and sending them to remote friends.
- **Live Attendance Feed**: Real-time ticker showing students verifying their presence.
- **Student Simulator Desk**: Test the student check-in experience directly on screen.

### 3. Student Self Check-in Portal (`/student-portal`)
- Mobile-first standalone portal for students to enter the active classroom code or scan the projected QR code.
- Instant presence confirmation with celebratory feedback and cryptographic verification receipt.

### 4. Attendance Intelligence & Shortage Watchlist
- **Automatic Compliance Calculation**: Computes attendance percentages against the mandatory 75% university eligibility cutoff.
- **Dynamic Shortage Recovery Formula**: Calculates the exact number of consecutive sessions a student must attend without absence to restore exam eligibility (e.g., *"Must attend next 3 consecutive classes"*).
- **Formal Shortage Warning Notices**: Dispatch administrative warning alerts with one click.

### 5. Leave Management & Rectification Desk
- Medical and official duty leave applications with document attachments.
- Faculty approval/rejection workflow.
- **Automated Rectification**: Approving leave retroactively updates affected class sessions to 'Excused' and recalculates eligibility status.

### 6. Institutional Audit Trail & Department Analytics
- Immutable ledger tracking every roll change, session launch, leave decision, and QR scan.
- Day-of-week attendance patterns and lecture vs. lab format metrics.
- One-click **Export to Official Attendance Master CSV**.

### 7. Neon Cloud PostgreSQL Integration
- Supports Neon pooled connection strings (`@neondatabase/serverless` / `pg`).
- In-app **Neon Database Diagnostics Panel**:
  - Live latency ping
  - Table count inspection
  - In-browser password input & test connection
  - 1-click **Initialize & Seed Neon Cloud Tables**

---

## Quick Start

### 1. Connecting Your Neon Database
In your project directory, open `.env.local`:

```bash
# Replace [YOUR_PASSWORD] with your password from the 'Show password' button in the Neon dashboard
DATABASE_URL="postgresql://neondb_owner:[YOUR_PASSWORD]@ep-bold-silence-b3bw8hxt-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

*Alternatively, launch the app and click the **Neon DB** badge in the top right corner of the dashboard to paste your password and initialize tables directly from the UI!*

### 2. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

