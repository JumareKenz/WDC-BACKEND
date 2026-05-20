# UI/UX Specification Document
## Kaduna State WDC Digital Reporting System

> **Purpose:** This document is an exhaustive UI/UX specification for rebuilding the frontend in a different codebase. It covers every page, component, design token, user flow, and API contract.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Structure by Role](#2-navigation-structure-by-role)
3. [Pages & Routes](#3-pages--routes)
4. [Reusable Components](#4-reusable-components)
5. [User Flows](#5-user-flows)
6. [API Contract](#6-api-contract)

---

## 1. Design System

### 1.1 Color Palette

#### Primary Colors (Green - Nigeria/Kaduna themed)

| Token | Hex | Usage |
|-------|-----|-------|
| primary-50 | #f0fdf4 | Backgrounds, hover states |
| primary-100 | #dcfce7 | Light fills |
| primary-200 | #bbf7d0 | Borders, subtle fills |
| primary-300 | #86efac | Accent borders |
| primary-400 | #4ade80 | Icons, indicators |
| primary-500 | #22c55e | Primary brand color |
| primary-600 | #16a34a | Primary hover/active, buttons |
| primary-700 | #15803d | Dark text on light bg |
| primary-800 | #166534 | Strong emphasis |
| primary-900 | #14532d | Darkest primary |

#### Neutral Colors

| Token | Hex (Light) | Hex (Dark) |
|-------|-------------|------------|
| neutral-50 | #fafafa | #0a0a0a |
| neutral-100 | #f5f5f5 | #171717 |
| neutral-200 | #e5e5e5 | #262626 |
| neutral-300 | #d4d4d4 | #404040 |
| neutral-400 | #a3a3a3 | #525252 |
| neutral-500 | #737373 | #737373 |
| neutral-600 | #525252 | #a3a3a3 |
| neutral-700 | #404040 | #d4d4d4 |
| neutral-800 | #262626 | #e5e5e5 |
| neutral-900 | #171717 | #fafafa |

#### Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Success | Green | #22c55e |
| Warning | Amber | #f59e0b |
| Error | Red | #ef4444 |
| Info | Blue | #3b82f6 |

#### Accent Colors

| Use Case | Color | Hex |
|----------|-------|-----|
| AI Chat | Purple | #a855f7 |
| Danger/Destructive | Red | #dc2626 |
| Warning Alerts | Yellow | #eab308 |
| Tertiary (Emerald) | Emerald | #10b981 |
| Tertiary (Teal) | Teal | #14b8a6 |

### 1.2 Typography

**Font Family:** System sans-serif stack (Tailwind `font-sans`)

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| h1 | 30px / 36px (lg) | 600 (semibold) | `text-3xl lg:text-4xl font-semibold` |
| h2 | 24px / 30px (lg) | 600 | `text-2xl lg:text-3xl font-semibold` |
| h3 | 20px / 24px (lg) | 600 | `text-xl lg:text-2xl font-semibold` |
| h4 | 18px / 20px (lg) | 600 | `text-lg lg:text-xl font-semibold` |
| Body large | 16px | 400 | `text-base` |
| Body default | 14px | 400 | `text-sm` |
| Body small | 12px | 400 | `text-xs` |
| Label | 14px | 500 | `text-sm font-medium` |
| Badge | 12px | 500 | `text-xs font-medium` |

### 1.3 Spacing Scale

| Token | Value | CSS Variable |
|-------|-------|-------------|
| xs | 4px (0.25rem) | `--spacing-xs` |
| sm | 8px (0.5rem) | `--spacing-sm` |
| md | 16px (1rem) | `--spacing-md` |
| lg | 24px (1.5rem) | `--spacing-lg` |
| xl | 32px (2rem) | `--spacing-xl` |
| 2xl | 48px (3rem) | `--spacing-2xl` |

### 1.4 Border Radius

| Token | Value | CSS Variable |
|-------|-------|-------------|
| sm | 4px (0.25rem) | `--radius-sm` |
| md | 8px (0.5rem) | `--radius-md` |
| lg | 12px (0.75rem) | `--radius-lg` |
| xl | 16px (1rem) | `--radius-xl` |
| full | 50% | — |

### 1.5 Shadows

| Token | Value |
|-------|-------|
| sm | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| md | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| lg | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |
| xl | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |

Colored shadows: `shadow-primary-500/25`, `shadow-red-500/25`, `shadow-green-500/25`

### 1.6 Glassmorphism

| Class | Background | Blur | Border | Shadow |
|-------|-----------|------|--------|--------|
| `.glass-nav` | `rgba(255,255,255,0.93)` | 24px | `1px solid rgba(0,0,0,0.07)` | `0 2px 16px rgba(0,0,0,0.08)` |
| `.glass-sidebar` | `rgba(255,255,255,0.96)` | 28px | `border-right: 1px solid rgba(0,0,0,0.07)` | — |
| `.glass-card` | `rgba(255,255,255,0.9)` | 16px | `1px solid rgba(0,0,0,0.07)` | `0 4px 24px rgba(0,0,0,0.08)` |
| `.glass-card-strong` | `rgba(255,255,255,0.94)` | 20px | `1px solid rgba(0,0,0,0.08)` | `0 8px 32px rgba(0,0,0,0.1)` |
| `.glass-modal` | `rgba(255,255,255,0.97)` | 32px | `1px solid rgba(0,0,0,0.08)` | `0 25px 60px rgba(0,0,0,0.2)` |

Dark mode overrides use `rgba(23,23,23,...)` backgrounds with adjusted opacity.

### 1.7 Animations

| Name | Duration | Easing | Description |
|------|----------|--------|-------------|
| `fadeIn` | 0.3s | ease-out | Opacity 0 → 1 |
| `slideIn` | 0.3s | ease-out | translateX(-100%) → 0 |
| `slideDown` | 0.2s | ease-out | translateY(-10px) → 0 |
| `slideInRight` | 0.3s | ease-out | translateX(20px) → 0 |
| `slideInLeft` | 0.3s | ease-out | translateX(-20px) → 0 |
| `scale-in` | 0.2s | ease-out | scale(0.95) → 1 |
| `pulse-soft` | 2s | ease-in-out infinite | opacity 1 → 0.7 → 1 |
| `card-lift` | 0.3s | cubic-bezier(0.4,0,0.2,1) | translateY(-3px) + shadow increase |

### 1.8 Dark Mode

- **Strategy:** Tailwind `darkMode: 'class'` — `dark` class on `<html>`
- **Persistence:** `wdc_color_scheme` in localStorage (`'dark'` or `'light'`)
- **Fallback:** OS `prefers-color-scheme`
- **Implementation:** All neutral colors invert; primary/status colors stay consistent; glassmorphism backgrounds darken

### 1.9 Component Style Patterns

#### Buttons

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| primary | green-600 | white | none | shadow-lg shadow-primary-500/25 |
| secondary | neutral-100 | neutral-900 | none | neutral-200 |
| outline | transparent | primary-600 | primary-300 | primary-50 bg |
| ghost | transparent | neutral-700 | none | neutral-100 bg |
| danger | red-600 | white | none | shadow-lg shadow-red-500/25 |
| success | green-600 | white | none | shadow-lg shadow-green-500/25 |

Sizes: `sm` (px-3 py-1.5 text-sm), `md` (px-4 py-2.5 text-sm), `lg` (px-6 py-3 text-base), `xl` (px-8 py-4 text-lg)

#### Inputs

```
Base: w-full px-4 py-2.5 bg-white border border-neutral-300 rounded-lg
      text-neutral-900 placeholder-neutral-400
      focus:ring-2 focus:ring-primary-500 focus:border-transparent
      disabled:bg-neutral-100 disabled:cursor-not-allowed
Error: border-red-500 focus:ring-red-500
Dark:  dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100
```

#### Badges

| Variant | Background | Text |
|---------|-----------|------|
| success | green-100 | green-800 |
| warning | yellow-100 | yellow-800 |
| error | red-100 | red-800 |
| info | blue-100 | blue-800 |
| neutral | neutral-100 | neutral-800 |

Style: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`

#### Cards

```
Base: rounded-xl bg-white border border-neutral-200 shadow-md transition-all duration-300
Padding: none | sm (p-4) | default (p-6) | lg (p-8)
Variants: default | glass (.glass-card) | glass-strong (.glass-card-strong)
Hover (hoverable): card-lift translateY(-3px) + shadow increase
```

#### Tables

```
Header: py-3 px-4 text-sm font-semibold text-neutral-700 bg-neutral-50
Cell:   py-3 px-4 text-sm text-neutral-600
Row:    border-b border-neutral-100 hover:bg-neutral-50
```

---

## 2. Navigation Structure by Role

### 2.1 WDC Secretary (`/wdc/*`)

**Sidebar Navigation:**
- Dashboard (`/wdc`) — LayoutDashboard icon
- Submit Report (`/wdc/submit`) — FileText icon
- My Reports (`/wdc/reports`) — FileCheck icon
- Notifications (`/wdc/notifications`) — Bell icon
- Messages (`/wdc/feedback`) — MessageSquare icon

**Bottom Actions:**
- Settings (`/settings`) — Settings icon
- Logout — LogOut icon (red)

### 2.2 LGA Coordinator (`/lga/*`)

**Sidebar Navigation:**
- Dashboard (`/lga`) — LayoutDashboard icon
- Wards (`/lga/wards`) — MapPin icon
- Reports (`/lga/reports`) — FileText icon
- Notifications (`/lga/notifications`) — Bell icon
- Messages (`/lga/feedback`) — MessageSquare icon

**Bottom Actions:**
- Settings (`/settings`) — Settings icon
- Logout — LogOut icon (red)

### 2.3 State Official (`/state/*`)

**Sidebar Navigation:**
- Dashboard (`/state`) — LayoutDashboard icon
- Analytics (`/state/analytics`) — BarChart3 icon
- Submissions (`/state/submissions`) — FileCheck icon
- LGA Directory (`/state/lgas`) — Building icon
- Investigations (`/state/investigations`) — Search icon
- Form Builder (`/state/forms`) — FormInput icon
- User Management (`/state/users`) — Users icon
- Notifications (`/state/notifications`) — Bell icon

**Bottom Actions:**
- AI Chat — Sparkles icon (purple gradient button, STATE_OFFICIAL only)
- Settings (`/settings`) — Settings icon
- Logout — LogOut icon (red)

### 2.4 Top Navbar (All Roles)

- Left: Hamburger menu (mobile only)
- Center: Logo
- Right: Dark mode toggle | Notification bell (links to role notifications) | User avatar dropdown
- User dropdown: Profile link, Settings link, Logout

---

## 3. Pages & Routes

### 3.1 Public Routes

#### Login Page (`/login`)
**File:** `src/pages/LoginPage.jsx`  
**Layout:** Single-column centered form, gradient background

**Form Fields:**
| Field | Type | Required | Placeholder | Icon |
|-------|------|----------|-------------|------|
| Email Address | email | Yes | "your.email@kaduna.gov.ng" | Mail |
| Password | password | Yes | "Enter your password" | Lock |

**Buttons:**
- "Sign In" — primary, submits form, shows loading spinner
- "Forgot Password?" — text link → `/forgot-password`
- Demo Account buttons (3) — quick-fill and submit for demo credentials

**Conditional UI:**
- Error alert banner on login failure
- Loading state on submit button
- Demo credentials section with role labels

**Demo Credentials:**
| Role | Email | Password |
|------|-------|----------|
| WDC Secretary | wdc@demo.kaduna.gov.ng | demo123 |
| LGA Coordinator | lga@demo.kaduna.gov.ng | demo123 |
| State Official | state@demo.kaduna.gov.ng | demo123 |

---

#### Forgot Password Page (`/forgot-password`)
**File:** `src/pages/ForgotPasswordPage.jsx`  
**Layout:** Centered card

**Form Fields:**
| Field | Type | Required | Icon |
|-------|------|----------|------|
| Email Address | email | Yes | Mail |

**Buttons:**
- "Send Reset Link" — primary
- "Back to Login" — text link

**Conditional UI:**
- Error alert on failure
- Success state: CheckCircle icon, "Reset Link Sent" heading, 1-hour expiry note, "Back to Login" button

---

#### Reset Password Page (`/reset-password?token=...`)
**File:** `src/pages/ResetPasswordPage.jsx`  
**Layout:** Centered card

**Form Fields:**
| Field | Type | Required | Validation | Icon |
|-------|------|----------|-----------|------|
| New Password | password (toggle show/hide) | Yes | min 6 chars | Lock |
| Confirm New Password | password (toggle show/hide) | Yes | must match above | Lock |

**Buttons:**
- "Reset Password" — primary

**Validation:**
- Password min 6 characters
- Passwords must match
- Token must be in URL query params

**Conditional UI:**
- Error alert with message
- Success state: CheckCircle, auto-redirect to login after 3s
- Show/hide password toggles

---

### 3.2 WDC Secretary Pages

#### WDC Dashboard (`/wdc`)
**File:** `src/pages/WDCDashboardPage.jsx`  
**Layout:** Stats cards, submission status alert, history table, sidebar panels

**Stats Cards (4 columns):**
| Card | Icon | Value | Subtitle |
|------|------|-------|----------|
| Current Report Status | FileText | Submitted/Pending | Month name |
| Total Reports | CheckCircle | Count | "X reviewed" |
| Meetings Held | Users | Count | "X total attendees" |
| Notifications | Bell | Unread count | — |

**Buttons:**
- "Submit Monthly Report" — primary (disabled if already submitted)
- "View History" — outline
- "View Notifications" — ghost
- "Refresh" — outline

**Conditional Sections:**
- Green alert if submitted for current month
- Amber alert if pending
- Submission History table (recent reports)
- Recent Notifications list
- Upcoming Deadlines card
- Performance Summary (Reports Reviewed, Avg Attendees, Pending Review)

---

#### Submit Report Page (`/wdc/submit`)
**File:** `src/pages/SubmitReportPage.jsx`  
**Layout:** Header with back button, main form area

**Header:** "Submit Monthly Report" with ward/LGA info and version badge

**Conditional States:**
- **Already Submitted:** Success card with CheckCircle + "View Reports" / "Back to Dashboard" buttons
- **Form State:** Renders `WDCReportWizard` (step-by-step) or `DynamicForm` (if custom form deployed)

**Buttons:**
- "Back to Dashboard" → `/wdc`
- "View Reports" → `/wdc/reports`

---

#### My Reports Page (`/wdc/reports`)
**File:** `src/pages/MyReportsPage.jsx`  
**Layout:** Stats cards, filters, reports table

**Stats Cards (4 columns):**
| Card | Icon | Value |
|------|------|-------|
| Total Reports | FileText | Count |
| Reports Reviewed | CheckCircle | Count |
| Total Meetings | Users | Count |
| Total Attendees | BarChart3 | Count |

**Filters:**
- Search by month (text input with Search icon)
- Status filter buttons: All | Submitted | Reviewed | Flagged

**Table Columns:**
| Column | Content |
|--------|---------|
| Month | Calendar icon + month name |
| Meetings | Circular badge with count |
| Attendees | Circular badge with count |
| Voice Notes | Mic icon or "None" |
| Status | Colored badge (blue=Submitted, green=Reviewed, yellow=Flagged) |
| Submitted | Date string |
| Actions | "View" button |

**Report Details Modal (on View click):**
- Status banner with date
- Summary grid: Meetings, Attendees, Voice Notes, Issues
- Sections (if present): Issues Identified, Actions Taken, Challenges, Reviewer Notes
- Close button

---

#### Notifications Page (`/wdc/notifications`)
**File:** `src/pages/NotificationsPage.jsx`  
**Layout:** Header with unread count, filter dropdown, notifications list

**Filters:** Dropdown — All | Unread Only | Read Only

**Notification Item:**
- Colored icon (by type)
- Title (bold) + Message body
- Timestamp
- Unread dot indicator
- "Mark Read" button (if unread)

**Notification Type Colors:**
| Type | Icon | Color |
|------|------|-------|
| REPORT_MISSING | AlertCircle | Red |
| REPORT_SUBMITTED | FileText | Blue |
| REPORT_REVIEWED | CheckCircle | Green |
| FEEDBACK | MessageSquare | Purple |
| REMINDER | Clock | Yellow |

**Buttons:**
- "Mark All Read" — outline (if unread > 0)
- "Mark Read" — ghost (per item)

---

#### Messages Page (`/wdc/feedback`)
**File:** `src/pages/MessagesPage.jsx`  
**Layout:** Compose section, filter tabs, message threads

**Compose Section:**
- Recipient selector buttons (LGA, STATE based on role)
- Textarea for message
- "Send Message" button (Send icon)

**Filter Tabs:** All | Received | Sent | Unread

**Message Thread Item:**
- Sender name + role badge + "You" badge (if sent)
- Recipient info
- Message body (whitespace preserved)
- Timestamp
- Read status (Check / CheckCheck icons)
- Reply button, View Replies (thread expansion), Mark Read

**Reply Mode:** Inline preview of original + reply textarea + Send

---

### 3.3 LGA Coordinator Pages

#### LGA Dashboard (`/lga`)
**File:** `src/pages/LGADashboardPage.jsx`  
**Layout:** Stats cards, charts, missing reports section, reports table, sidebar

**Stats Cards (5 columns):**
| Card | Icon | Value | Subtitle |
|------|------|-------|----------|
| Total Wards | MapPin | Count | "X tracking" |
| Submitted | CheckCircle | Count | "X% rate" |
| Missing | AlertTriangle | Count | "Action required" |
| Reviewed | Activity | Count | — |
| Flagged | FileText | Count | — |

**Charts:**
- Submission Progress (progress bar + pie chart)
- Ward Performance (meetings + attendees bars)

**Missing Reports Section:**
- Ward list with checkboxes (secretary name, "Missing" badge)
- "Select All" button
- "Send Reminder to Selected" button

**Reports Table:**
- Columns: Ward, Month, Meetings, Attendees, Status, Submitted, Action
- View button per row → opens Review Report Modal

**Review Report Modal:**
- Ward, Month, Meetings, Attendees display
- Issues, Actions, Challenges fields
- Reviewer Notes textarea
- "Mark Reviewed" (green) | "Flag Report" (orange) buttons

**Right Sidebar:**
- This Month Summary (Submitted, Missing, Rate %)
- Messages card (textarea + Send)
- Recent messages list
- Quick Actions: Send Reminders, View Calendar

---

#### LGA Wards Page (`/lga/wards`)
**File:** `src/pages/LGAWardsPage.jsx`  
**Layout:** Stats, search/filter, ward cards grid

**Stats Cards (4 columns):**
| Card | Icon | Value |
|------|------|-------|
| Total Wards | MapPin | Count |
| Submitted Reports | CheckCircle | Count + rate % |
| Missing Reports | XCircle | Count |
| Avg Population | Users | Calculated |

**Filters:**
- Search (ward name or secretary)
- Submission dropdown: All | Submitted | Missing

**Ward Card:**
- MapPin icon, ward name, code
- Status: CheckCircle green (submitted) or XCircle red (missing)
- Population, Secretary name, Submission date
- Stats grid (Meetings, Attendees) if submitted
- Buttons: "View" | "Remind" (if not submitted)
- Border: green if submitted, red + animated pulse if missing

**Ward Details Modal:**
- Basic Info: Population, Status
- Secretary Info: Name, email
- Report Stats (if submitted)
- "Send Reminder" button (if not submitted)

---

#### LGA Reports Page (`/lga/reports`)
**File:** `src/pages/LGAReportsPage.jsx`  
**Layout:** Stats, filters, reports table

**Stats Cards (6 columns):**
| Card | Icon |
|------|------|
| Total Reports | FileText |
| Pending Review | Clock |
| Reviewed | CheckCircle |
| Flagged | AlertTriangle |
| Total Meetings | Activity |
| Total Attendees | Users |

**Filters:**
- Search by ward name
- Status dropdown: All | Submitted | Reviewed | Flagged
- Month dropdown
- Export button (Download icon)

**Table Columns:** Ward (with status dot), Month, Meetings, Attendees, Status, Submitted, Action

**Report Details Modal:**
- Ward, month, submission date, status badge
- Key Metrics: Meetings (green bg), Attendees (blue bg)
- Content sections: Issues, Actions, Challenges, Recommendations, Notes
- Decline Reason (if declined, red)
- Review buttons (if SUBMITTED): Approve | Flag | Decline
- Decline modal with required reason textarea

---

### 3.4 State Official Pages

#### State Dashboard (`/state`)
**File:** `src/pages/StateDashboardPage.jsx`  
**Layout:** Complex multi-panel — stats, performance cards, charts, LGA table, sidebar

**Header Buttons:** Refresh | Export CSV | Generate AI Report

**Stats Cards (6 columns):**
| Card | Icon | Value |
|------|------|-------|
| Total LGAs | Building | Count |
| Total Wards | MapPin | Formatted count |
| Submitted | CheckCircle | Count + rate % |
| Missing | AlertTriangle | Count |
| Reviewed | Activity | Count |
| Flagged | FileText | Count |

**Performance Categories (4 horizontal cards):**
| Tier | Threshold | Color |
|------|-----------|-------|
| Excellent | >= 90% | Green gradient |
| Good | 70-89% | Blue gradient |
| Needs Attention | 50-69% | Yellow gradient |
| Critical | < 50% | Red gradient |

**Charts:**
- Submission Trends (Area/Line/Bar toggle, last 6 months)
- Status Distribution (Pie chart)
- LGA Performance Comparison (Horizontal bar, top 10)

**LGA Table:** Searchable, sortable — LGA, Wards, Submitted, Missing, Rate, Status

**Right Sidebar:**
- AI Generated Report (if generated): Executive Summary, Key Insights, Recommendations, Copy button
- Active Investigations: List with status/priority badges, Start/Close buttons
- Quick Actions: Generate AI Report, Export, Form Builder, New Investigation, Update LGAs & Wards, Update State Executive Name

**Modals:**
- Create Investigation: Title, Description, Priority (select), LGA (select)
- Report Detail: Full report data with all 8 sections

---

#### State Analytics Page (`/state/analytics`)
**File:** `src/pages/StateAnalyticsPage.jsx`  
**Layout:** Metrics, charts, performance lists

**Timeframe Selector:** 3, 6, 12 months dropdown

**Metrics Cards (4 columns):**
| Card | Icon |
|------|------|
| Current Rate | BarChart3 + trend arrow |
| Average Rate | Activity |
| Top Performers | CheckCircle |
| Needs Attention | AlertTriangle |

**Charts:**
- Submission Rate Trend (Line/Area/Bar toggle)
- LGA Performance Distribution (Pie)
- Community Engagement Trends (Bar: Meetings + Attendance)

**Performance Lists:**
- Top 5 LGAs (green gradient cards with rank, rate %, CheckCircle)
- Bottom 5 LGAs (red gradient cards with rank, rate %, AlertTriangle)

---

#### State Submissions Page (`/state/submissions`)
**File:** `src/pages/StateSubmissionsPage.jsx`  
**Layout:** Month picker, stats, filters, LGA accordion groups

**Month Selector:** HTML `<input type="month">`

**Stats Cards (4 columns):**
| Card | Icon |
|------|------|
| Total Submissions | FileText |
| Wards Reported | Users + coverage % |
| Voice Notes | Mic |
| Submission Rate | TrendingUp + status |

**Filters:** Search, Status dropdown, LGA dropdown, Refresh button

**LGA Accordion Groups:**
- Header: ChevronDown/Right, LGA name, submission count/total, rate %, performance badge
- Expanded: Submissions table — Ward (+ code + submitted by), Meetings, Attendees, Status, Submitted, Audio (Mic), Action (View)
- Sortable columns

**Report Detail Modal:**
- Full ReportDetailView component
- Voice Notes section (Play/Pause, filename, duration, transcription, Download)
- Review buttons (Approve/Flag/Decline) if status = SUBMITTED

---

#### State LGAs Page (`/state/lgas`)
**File:** `src/pages/StateLGAsPage.jsx`  
**Layout:** Stats, filters, LGA cards grid

**Stats Cards (5 columns):** Total LGAs, Total Wards, Avg Rate, Excellent LGAs, Critical LGAs

**Filters:** Search (LGA/coordinator name), Performance dropdown (Excellent/Good/Needs Attention/Critical)

**LGA Card:**
- MapPin icon, LGA name, code
- Performance icon + badge
- Submission Rate (large bold %)
- Stats: Wards, Submitted, Missing
- Coordinator name
- "View Details" button
- Card border color matches performance tier

**LGA Details Modal:**
- Header gradient by performance tier
- Key Metrics: Submission Rate, Reviewed Reports
- Ward Stats: Total, Submitted, Missing
- Coordinator Info

---

#### Investigations Page (`/state/investigations`)
**File:** `src/pages/InvestigationsPage.jsx`  
**Layout:** Stats, filters, investigation cards list

**Stats Cards (5):** Total, Open, In Progress, Closed, Urgent

**Filters:** Search, Status dropdown, Priority dropdown

**Investigation Card:**
- Status icon (colored: red=OPEN, blue=IN_PROGRESS, green=CLOSED)
- Title, Description (2 lines)
- Priority badge + Status badge
- Meta: LGA, Created by, Date, Type
- "View" button

**Create Modal:** Title, Description, Priority, Type, LGA (optional)

**Details Modal:** Title, status/priority badges, description, meta grid, action buttons (Start/Close based on status)

---

#### Form Builder Page (`/state/forms`)
**File:** `src/pages/StateFormsPage.jsx`  
**Layout:** Stats, forms table, full-screen form builder overlay

**Stats Cards (3):** Draft, Deployed, Archived

**Forms Table:** Name + description, Version, Status badge, Deployed date, Actions (Edit, Deploy/Confirm/Cancel)

**Form Builder (overlay):** Full FormBuilder component — sections tree, field properties, live preview, save/deploy

---

#### User Management Page (`/state/users`)
**File:** `src/pages/StateUsersPage.jsx`  
**Layout:** Two-column — LGA tree nav (left) + user detail (right)

**Summary Stats (4):** Total LGAs (with wards), Coordinators (assigned/unassigned), Secretaries (assigned/unassigned), Active Rate

**Left Panel — LGA Tree:**
- Search input
- Expandable LGA buttons (Building2 icon, ward count badge)
- Nested ward buttons (MapPin icon)
- Selected state: primary gradient bg

**Right Panel — User Detail:**
- Gradient header with avatar + name + role badge
- Info rows: Email (+ Copy), Phone, Assignment, Access Status (green/red dot), Last Login
- Action buttons: Edit Profile | Reset Password | Revoke/Restore Access

**Empty States:** No selection → prompt message | No user assigned → "Assign" button

**Modals:**
- **Edit Profile:** Full Name, Phone, email-immutable warning
- **Reset Password:** New Password (show/hide), Confirm Password, 6-char minimum note
- **Revoke/Restore Access:** Warning box with consequences, confirm button
- **Assign User:** Full Name, Email (pre-filled pattern), Phone (required for SMS), Password (optional)
- **Credentials Display:** Success message, Username + Password with Copy buttons, login instructions

---

### 3.5 Shared Pages

#### Settings Page (`/settings`, `/profile`)
**File:** `src/pages/SettingsPage.jsx`  
**Layout:** Sidebar tabs + content area

**Tabs:** Profile | Notifications | Security | Logout

**Profile Tab:**
- Avatar circle with initial
- Fields: Full Name, Email (disabled for WDC/LGA), Phone, Role (disabled)
- Assigned Location (read-only): Ward, LGA
- "Save Changes" button

**Notifications Tab:**
- Toggle switches: Email Notifications, SMS Notifications, Report Reminders, Feedback Alerts
- "Save Preferences" button

**Security Tab:**
- Change Password: Current Password, New Password, Confirm Password (all with show/hide toggles)
- "Update Password" button (disabled until all filled)
- Danger Zone: Logout button (red)

---

#### 404 Not Found Page (`*`)
**Layout:** Centered card

**Content:**
- "404" heading (text-6xl, primary-600)
- "Page Not Found" subheading
- Link: "Go to Dashboard" (if authenticated) or "Go to Login"

---

## 4. Reusable Components

### 4.1 Common Components

#### Alert (`components/common/Alert.jsx`)
**Props:** `type` (info|success|error|warning), `title?`, `message`, `onClose?`, `className?`, `icon?`  
**Renders:** Flex layout with colored icon, text content, optional close button. Color-coded by type.

**Exported Variants:**
- **Toast** — Fixed position, auto-dismiss. Props: `type`, `message`, `onClose`, `duration`, `position`
- **Banner** — Full-width. Props: `type`, `message`, `onClose`, `action` (JSX)
- **InlineAlert** — Compact inline. Props: `type`, `message`, `className`

---

#### Button (`components/common/Button.jsx`)
**Props:** `children`, `variant` (primary|secondary|outline|ghost|danger|success), `size` (sm|md|lg|xl), `loading`, `disabled`, `fullWidth`, `icon`, `iconPosition` (left|right), `className`, `type`, `onClick`, `...htmlProps`  
**Renders:** Inline-flex button with icon support, loading spinner state, focus ring, transitions.

---

#### Card (`components/common/Card.jsx`)
**Props:** `children`, `title?`, `subtitle?`, `action?` (JSX), `footer?` (JSX), `hoverable?`, `variant` (default|glass|glass-strong), `className?`, `padding` (none|sm|default|lg), `...divProps`  
**Renders:** Rounded card with optional header (title + action), body, footer.

**Exported Variants:**
- **IconCard** — Props: `icon`, `iconColor` (primary|success|warning|error|info|neutral), `title`, `value`, `subtitle`, `trend`, `variant`, `className`
- **EmptyCard** — Props: `icon`, `title`, `description`, `action`, `className`

---

#### Layout (`components/common/Layout.jsx`)
**Props:** `children`  
**Renders:** Full app layout — glass sidebar (collapsible, role-based nav items), top Navbar, main content area. Mobile responsive with hamburger menu.

---

#### LoadingSpinner (`components/common/LoadingSpinner.jsx`)
**Props:** `size` (sm|md|lg|xl), `text?`, `fullScreen?`  
**Renders:** Animated Loader2 icon with optional text. Full-screen variant covers viewport.

**Exported Variants:**
- **LoadingOverlay** — Props: `loading`, `children`, `text`
- **Skeleton** — Props: `className`, `width`, `height`
- **CardSkeleton** — Props: `count`

---

#### Logo (`components/common/Logo.jsx`)
**Props:** `size` (sm|default|lg|xl), `showText?`, `className?`, `linkTo?`  
**Renders:** SVG gradient logo (green shield + checkmark) with optional text. Also exports `LogoIcon`.

---

#### LogoutButton (`components/common/LogoutButton.jsx`)
**Props:** `variant?`, `size?`, `fullWidth?`, `showIcon?`, `className?`  
**Renders:** Button that opens confirmation modal before logging out. Shows user info in modal.

Also exports: **LogoutIconButton** — compact icon-only variant.

---

#### Modal (`components/common/Modal.jsx`)
**Props:** `isOpen`, `onClose`, `title`, `children`, `footer?`, `size` (sm|md|lg|xl|full), `closeOnOverlayClick?`, `closeOnEscape?`, `showCloseButton?`  
**Renders:** Centered modal with backdrop blur, glass effect, header, scrollable body, optional footer. Prevents body scroll.

**Exported Variant:**
- **ConfirmModal** — Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmText`, `cancelText`, `variant`, `loading`

---

#### Navbar (`components/common/Navbar.jsx`)
**Props:** `onMenuToggle`  
**Renders:** Sticky glass nav with dark mode toggle, notification bell, user avatar dropdown.

---

#### OfflineBanner (`components/common/OfflineBanner.jsx`)
**Props:** `isSyncing?`, `pendingCount?`  
**Renders:** Contextual network status banner. Amber when offline, spinner when syncing, green when reconnected (4s). Position: bottom (native), top (web).

---

#### PWAInstallPrompt (`components/common/PWAInstallPrompt.jsx`)
**Props:** None  
**Renders:** Bottom card with app icon, "Install" button, "Later" button. Hidden on native builds. Dismissible via sessionStorage.

---

#### RefreshIndicator (`components/common/RefreshIndicator.jsx`)
**Props:** None  
**Renders:** Fixed bottom-right pill with spinner during silent token refresh. Non-blocking (pointer-events-none). Min 1.2s visibility.

---

#### SessionWarningModal (`components/common/SessionWarningModal.jsx`)
**Props:** `isOpen`, `countdown`, `onContinue`, `onLogout`, `isExtended?`  
**Renders:** Large countdown timer (color changes: red <1min, amber <2min), progress bar, "Stay Logged In" / "Logout Now" buttons.

---

#### ToastContainer (`components/common/ToastContainer.jsx`)
**Props:** None (uses `useToast()` context)  
**Renders:** Fixed top-right stacked toasts (max 5). Each has icon, title, message, dismiss button, progress bar. Auto-dismiss by duration.

---

#### Tooltip (`components/common/Tooltip.jsx`)
**Props:** `text`, `position` (top|bottom|left|right), `icon?`, `className?`  
**Renders:** HelpCircle icon; on hover/focus shows dark tooltip popup. Keyboard accessible.

---

### 4.2 Error System (`components/common/ErrorSystem/`)

- **ErrorProvider** — Context managing global error state (array of errors + field-specific map)
- **useErrors** — Hook: `{ errors, fieldErrors, addError, removeError, clearFieldError, clearAll }`
- **FieldError** — Props: `field`, `className`. Renders: red icon + error text below input.
- **ErrorSummary** — Props: `errors`, `onFieldClick`. Renders: card with error count + clickable list.

---

### 4.3 Form Wizard (`components/common/FormWizard/`)

#### FormWizard
**Props:** `steps` (array of {id, title, description, component, condition?, reviewComponent?}), `initialData`, `onSubmit`, `onSaveDraft?`, `validateStep?`, `validateAll?`, `allowSkip?`, `showProgress?`, `autoSaveInterval?`, `className?`  
**Renders:** Progress header (step count + %), current step with slide animation, fixed bottom nav (Back/Next), save status, review modal before submit.

#### WizardField
**Props:** `label`, `required?`, `helpText?`, `children`, `error?`, `className?`  
**Renders:** Label with asterisk, help text, input slot, inline error.

---

### 4.4 WDC Components (`components/wdc/`)

#### DraftStatusBar
**Props:** `draftStatus`, `lastSavedAt?`, `isOnline`, `queueStats`, `isSyncing`, `onForceSave?`, `onRetryFailed?`  
**Renders:** Horizontal bar — status icon/text, online/offline indicator, manual save button. Color-coded.

#### DynamicForm
**Props:** `definition`, `onSuccess?`, `onCancel?`, `readOnly?`, `initialData?`  
**Renders:** Runtime form from schema — sections, conditional fields, voice recording, table inputs, submit/cancel.

#### SubmissionHistory
**Props:** `reports`, `loading?`, `showPagination?`  
**Renders:** Desktop: sortable table. Mobile: card grid. Status badges, View button per report.

#### VoiceNoteUpload
**Props:** `onChange`, `disabled?`, `uploadProgress?`, `uploadSuccess?`  
**Renders:** Drag-drop zone or file preview with audio player. Validates: MP3/M4A/WAV/OGG/WEBM, max 10MB.

#### VoiceRecorder
**Props:** `fieldName`, `onRecordingComplete`, `disabled?`, `compact?`, `existingRecording?`  
**Renders:** WhatsApp-style recorder — mic button, timer, play/pause/delete. Records to WebM.

#### WDCReportForm
**Props:** `onSuccess`, `onCancel`, `userWard`, `userLGA`, `submissionInfo`  
**Renders:** 8+ collapsible sections scrollable form with auto-save, offline queue, voice/photo uploads, attendance calculation. Sticky bottom: Cancel | Save Draft | Submit.

#### WDCReportWizard
**Props:** Same as WDCReportForm  
**Renders:** Step-by-step wizard version using FormWizard. Progress tracking + review modal.

---

### 4.5 State Components

#### AIChatInterface (`components/state/AIChatInterface.jsx`)
**Props:** `isOpen`, `onClose`  
**Renders:** Fixed modal with chat history, message bubbles, example questions, typing indicator, text input.

#### ConditionGroupBuilder (`components/state/ConditionGroupBuilder.jsx`)
**Props:** `group`, `onChange`, `allFields`, `depth`  
**Renders:** Recursive AND/OR condition builder with nested rules (max depth 2).

#### FormBuilder (`components/state/FormBuilder.jsx`)
**Props:** `form?`, `onSave`, `onClose`  
**Renders:** Full-screen modal — 3-column: sections tree | field properties | preview. Supports 8 field types, conditional logic, table columns, save/deploy.

---

### 4.6 Reports Components

#### ReportDetailView (`components/reports/ReportDetailView.jsx`)
**Props:** `report`  
**Renders:** Full formatted report — meeting info, agenda, action tracker table, health data (immunization, diseases, ANC, family planning, TB, Hep B), facility support, transportation, cMPDSR, community feedback, VDC reports, mobilization, action plan, attendance summary, photos with lightbox.

---

### 4.7 Context Providers

#### AuthContext (`contexts/AuthContext.jsx`)
**Exports:** `AuthProvider`, `useAuth`, `withAuth`

**Context Value:**
- `isAuthenticated`, `user`, `isLoading`, `isOffline`, `canSubmit`, `lastError`
- `login(credentials)`, `logout()`, `getAccessToken()`, `refreshToken()`
- `getDefaultRoute()`, `hasRole(role)`, `canUseOffline()`

---

### 4.8 Plugins

#### Capacitor (`plugins/capacitor.js`)
**Exports:**
- `isNative` — boolean
- `platform` — 'android' | 'ios' | 'web'
- `storage` — `get(key)`, `set(key, value)`, `remove(key)`, `clear()`
- `secureStorage` — same API (IndexedDB on web)
- `network` — `getStatus()`, `addListener(cb)`
- `appLifecycle` — `onPause(cb)`, `onResume(cb)`, `getState()`

---

## 5. User Flows

### 5.1 Login → Role-Based Redirect

```
1. User navigates to /login
2. Enters email + password (or clicks demo account)
3. Frontend calls POST /auth/login
4. Backend validates credentials, returns { access_token, refresh_token, user }
5. Frontend stores:
   - Access token → memory only (XSS protection)
   - Refresh token → IndexedDB (wdc-auth-db)
   - User profile → IndexedDB
6. AuthProvider sets isAuthenticated = true
7. Redirect based on user.role:
   - WDC_SECRETARY → /wdc
   - LGA_COORDINATOR → /lga
   - STATE_OFFICIAL → /state
8. Splash screen hidden via 'wdc:auth-ready' custom event
```

### 5.2 Token Refresh Flow

```
1. API call returns 401 Unauthorized
2. Axios interceptor catches 401
3. Sets config._retried = true to prevent loops
4. Calls RefreshIndicator onStart()
5. Reads refresh token from IndexedDB
6. Posts to POST /auth/refresh with { refresh_token }
7. On success:
   - Updates access token in memory
   - Rotates refresh token in IndexedDB
   - Retries original request with new token
   - Calls RefreshIndicator onEnd(true)
8. On failure:
   - Clears all auth state
   - Shows toast "Your session has expired. Please log in again."
   - Redirects to /login after 1.5s
```

### 5.3 Full Report Submission Flow (WDC Secretary)

#### Step-by-Step Wizard (WDCReportWizard)

**Step 1: Meeting Information**
| Field | Type | Validation |
|-------|------|-----------|
| Report Month | month picker | Required, auto-set |
| Meeting Date | date | Required |
| Meeting Type | select (Regular/Emergency/Special) | Required |
| Meeting Venue | text | Required |
| Start Time | time | Required |
| End Time | time | Required |

**Step 2: Attendance**
| Field | Type | Validation |
|-------|------|-----------|
| Male Attendees | number | >= 0 |
| Female Attendees | number | >= 0 |
| Youth Attendees | number | >= 0 |
| Total Attendees | computed | Auto-calculated |
| Attendance Photos | file (multiple) | .jpg/.png/.webm, max 10MB each |
| Group Photo | file | .jpg/.png/.webm, max 10MB |

**Step 3: Agenda & Governance**
| Field | Type |
|-------|------|
| Opening Prayer | checkbox |
| Previous Minutes Adopted | checkbox |
| Agenda Items | textarea (list) |
| Voice Note (optional) | audio recorder |

**Step 4: Health Data (3A)**
| Sub-section | Fields |
|-------------|--------|
| OPD | Total OPD visits, under-5 OPD |
| Immunization | BCG, OPV, Penta, Measles, Yellow Fever |
| Under-5 Diseases | Malaria, Diarrhea, Pneumonia, Malnutrition |
| ANC | Registrations, 4+ visits, facility deliveries, home deliveries |
| Family Planning | New acceptors, method types |
| TB | Suspected cases, confirmed cases, on treatment |
| Hepatitis B | Screened, positive, referred |

**Step 5: Facility Support (3B)**
| Field | Type |
|-------|------|
| Renovations Done | textarea |
| Items Donated | dynamic table (item, quantity, donor) |
| Items Repaired | dynamic table (item, description) |

**Step 6: Transportation & Emergency (3C)**
| Field | Type |
|-------|------|
| Emergency Transport Available | checkbox |
| Transport Type | text |
| Emergency Cases Referred | number |
| Maternal Deaths | number |
| Perinatal Deaths | number |
| Death Causes | textarea |

**Step 7: Community Feedback & VDC Reports**
| Field | Type |
|-------|------|
| Community Feedback | dynamic table (issue, source, action_taken, status) |
| VDC Reports | dynamic table (vdc_name, meetings_held, issues, actions) |

**Step 8: Action Plan & Conclusion**
| Field | Type |
|-------|------|
| Mobilization Activities | dynamic table (activity, target, achieved, challenges) |
| Action Plan | dynamic table (action_point, responsible, timeline, resources) |
| Support Required | textarea + voice note |
| Additional Notes (AOB) | textarea + voice note |
| Next Meeting Date | date |

**Final Step: Review & Submit**
- Review modal showing all entered data by section
- "Edit" buttons per section to go back
- "Submit Report" button
- On submit:
  1. Validate all required fields
  2. Check online status
  3. If online: POST /api/reports (multipart/form-data)
  4. If offline: Add to offline queue with UUID
  5. On success: Toast "Report submitted successfully", redirect to /wdc
  6. On error: Show error toast, keep form state

### 5.4 Offline Behavior

#### What the User Sees

**Going Offline:**
1. OfflineBanner appears (amber, "You are offline")
2. Position: bottom on native, top on web
3. All data entry continues working normally
4. Draft auto-save continues (to Capacitor Preferences)

**Submitting While Offline:**
1. User clicks "Submit Report"
2. System detects offline via @capacitor/network
3. Report data added to offline queue with UUID
4. Toast: "Report saved for submission when you're back online"
5. DraftStatusBar shows "Queued for sync" with pending count

**Coming Back Online:**
1. OfflineBanner changes to green "Back online" (4s)
2. After 1.5s: automatic sync begins
3. OfflineBanner shows spinner "Syncing X reports..."
4. Each queued item submitted with X-Submission-ID header
5. 500ms delay between items
6. On success: items removed from queue
7. On failure: retry with exponential backoff (max 3 retries)
8. Failed items marked as "failed" — manual retry available

#### Queue Item Lifecycle
```
User submits offline → status: 'queued'
Auto-sync starts → status: 'syncing'
Server accepts → removed from queue
Server rejects → retry (up to 3x) → status: 'failed'
User clicks Retry → status: 'queued' again
```

### 5.5 Session Timeout Flow

```
1. User is idle for 25 minutes (or 60 min if editing form)
2. SessionWarningModal appears:
   - Large countdown timer (5 min default)
   - "Stay Logged In" button
   - "Logout Now" button
3. Timer color changes: green → amber (<2min) → red (<1min)
4. If user clicks "Stay Logged In":
   - Timer resets
   - GET /auth/me to keep session alive
   - Modal closes
5. If timer reaches 0:
   - 'wdc:session-expiring' event dispatched (2s grace for draft save)
   - After grace: logout() called
   - Tokens cleared
   - Redirect to /login
6. Cross-tab sync: activity in any tab resets all tabs
7. Native: checks idle time on app resume from background
```

### 5.6 Draft Auto-Save Flow

```
1. User starts filling form
2. Each field change → useLocalDraft.updateFormData()
3. Debounce 1000ms → save to Capacitor Preferences
4. Key format: wdc_draft:{userId}:{wardId}:{reportMonth}
5. On tab blur / app background → immediate save (no debounce)
6. On page refresh (beforeunload) → immediate save
7. On next visit:
   - Hook checks for existing draft
   - If found: restores form state
   - DraftStatusBar shows "Draft restored" with timestamp
8. On successful submission → draft cleared
```

---

## 6. API Contract

### 6.1 Base Configuration

- **Base URL:** `VITE_API_BASE_URL` or `http://localhost:8000/api`
- **Timeout:** 30 seconds
- **Default Content-Type:** `application/json`
- **Auth Header:** `Authorization: Bearer {access_token}`
- **File Uploads:** `Content-Type: multipart/form-data`

### 6.2 Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

**Error:**
```json
{
  "success": false,
  "detail": "error message",
  "error": { ... }
}
```

Note: Axios interceptor unwraps `response.data`, so components receive the inner object directly.

### 6.3 Error Handling (Frontend)

| Status | User-Facing Message |
|--------|-------------------|
| 401 | "Your session has expired. Please log in again." (after failed refresh) |
| 400 | "Invalid request. Please check your input." |
| 403 | "You don't have permission to perform this action." |
| 404 | "The requested resource was not found." |
| 409 | Structured detail from server |
| 413 | "File too large. Please reduce file size." |
| 422 | Parsed Pydantic errors: "field: message" format |
| 429 | "Too many requests. Please wait a moment." |
| 500 | "Server error. Please try again later." |
| 503 | "Service temporarily unavailable." |
| Network | "No connection – your work has been saved as a draft and will sync when reconnected." |

### 6.4 Authentication Endpoints

#### POST /auth/login
**Request:** `{ email: string, password: string }`  
**Response:** `{ access_token, refresh_token, token_type: "bearer", user: UserResponse }`  
**Auth:** None

#### POST /auth/refresh
**Request:** `{ refresh_token: string }`  
**Response:** `{ access_token, refresh_token, token_type: "bearer", expires_in: 900 }`  
**Auth:** None

#### POST /auth/logout
**Request:** `{ refresh_token: string }`  
**Response:** `{ success: true, message: "Logged out successfully" }`  
**Auth:** Bearer token

#### GET /auth/me
**Response:** UserResponse  
**Auth:** Bearer token

#### POST /auth/forgot-password
**Query:** `?email=string`  
**Response:** `{ success: true, message: "If an account..." }`  
**Auth:** None

#### POST /auth/reset-password
**Query:** `?token=string&new_password=string`  
**Response:** `{ success: true, message: "Password reset successfully" }`  
**Auth:** None

### 6.5 Profile Endpoints

#### GET /profile/me
**Response:** UserResponse  
**Auth:** Bearer token

#### PATCH /profile/me
**Request:** `{ full_name?: string, phone?: string }`  
**Response:** UserResponse  
**Auth:** Bearer token

#### PATCH /profile/email
**Request:** `{ email: string }`  
**Response:** UserResponse  
**Auth:** Bearer token (STATE_OFFICIAL only)

#### POST /profile/change-password
**Request:** `{ current_password: string, new_password: string }`  
**Response:** `{ message: "Password changed successfully" }`  
**Auth:** Bearer token

### 6.6 Report Endpoints

#### POST /reports
**Content-Type:** multipart/form-data  
**Headers:** `X-Submission-ID: uuid` (optional, for idempotency)  
**Form Fields:**
- `report_month` (string, YYYY-MM, required)
- `meetings_held` (integer)
- `attendees_count` (integer)
- `issues_identified` (string)
- `actions_taken` (string)
- `challenges` (string)
- `recommendations` (string)
- `additional_notes` (string)
- `report_data` (JSON string — comprehensive form data)
- `voice_note` (file)
- `voice_awareness_theme` (file)
- `voice_traditional_leaders_support` (file)
- `voice_religious_leaders_support` (file)
- `voice_support_required` (file)
- `voice_aob` (file)
- `group_photo_*` (multiple files)

**Response:** ReportResponse  
**Auth:** Bearer token (WDC_SECRETARY only)

#### PUT /reports/{report_id}
Same form fields as POST  
**Auth:** Bearer token (WDC_SECRETARY, own report only)

#### GET /reports
**Query:** `?limit=10&offset=0`  
**Response:** `List[ReportListItem]`  
**Auth:** Bearer token (WDC_SECRETARY — own ward)

#### GET /reports/{report_id}
**Response:** ReportResponse  
**Auth:** Bearer token (role-scoped: WDC own ward, LGA own LGA, STATE all)

#### GET /reports/check-submitted
**Query:** `?month=YYYY-MM`  
**Response:** `{ month, submitted: boolean, report_id?, submitted_at? }`  
**Auth:** Bearer token (WDC_SECRETARY)

#### GET /reports/submission-info
**Response:** `{ success, data: { target_month, month_name, is_submission_window, current_day, already_submitted, has_draft, draft_id?, submission_period_description } }`  
**Auth:** Bearer token

#### GET /reports/state-submissions
**Query:** `?month=&lga_id=&report_status=&search=`  
**Response:** Object with month, totals, LGA-grouped reports  
**Auth:** Bearer token (STATE_OFFICIAL only)

#### PATCH /reports/{report_id}/review
**Request:** `{ action: "approve"|"decline", decline_reason?: string }`  
**Response:** `{ success, data: { id, status, reviewed_by, reviewed_at, decline_reason?, reviewer_name }, message }`  
**Auth:** Bearer token (LGA_COORDINATOR or STATE_OFFICIAL)

#### POST /reports/draft
**Content-Type:** multipart/form-data (same fields as POST /reports)  
**Response:** ReportResponse  
**Auth:** Bearer token (WDC_SECRETARY)

#### GET /reports/draft/existing
**Query:** `?report_month=YYYY-MM`  
**Response:** `{ has_draft, draft_id?, report_month, report_data, saved_at, has_voice_note }`  
**Auth:** Bearer token (WDC_SECRETARY)

#### DELETE /reports/draft/{draft_id}
**Response:** `{ success: true, message }`  
**Auth:** Bearer token (WDC_SECRETARY)

### 6.7 LGA & Ward Endpoints

#### GET /lgas
**Response:** `{ success, data: { lgas: [{ id, name, code, num_wards }], total } }`  
**Auth:** Bearer token

#### GET /lgas/{lga_id}
**Response:** `{ success, data: { id, name, code, population, num_wards, wards: [...] } }`  
**Auth:** Bearer token

#### GET /lgas/{lga_id}/wards
**Query:** `?month=YYYY-MM`  
**Response:** `{ success, data: { lga, month, wards: [{ id, name, code, secretary, report }], summary: { total_wards, submitted, missing, submission_rate } } }`  
**Auth:** Bearer token (LGA own LGA, STATE all)

#### GET /lgas/{lga_id}/missing-reports
**Query:** `?month=YYYY-MM`  
**Response:** `{ success, data: { lga_id, lga_name, month, missing_reports: [{ ward_id, ward_name, ward_code, secretary, last_submitted }], count } }`  
**Auth:** Bearer token (LGA/STATE)

#### GET /lgas/{lga_id}/reports
**Query:** `?month=&status_filter=&limit=50&offset=0`  
**Response:** `{ success, data: { reports: [...], total, limit, offset } }`  
**Auth:** Bearer token (LGA/STATE)

#### GET /wards/{ward_id}
**Response:** `{ success, data: { id, name, code, population, lga: {...} } }`  
**Auth:** Bearer token

#### GET /voice-notes/{voice_note_id}/download
**Response:** Binary audio file  
**Auth:** Bearer token (role-scoped)

### 6.8 Notification Endpoints

#### GET /notifications
**Query:** `?unread_only=false&limit=20&offset=0`  
**Response:** `{ success, data: { notifications: [{ id, notification_type, title, message, is_read, created_at, related_entity }], total, unread_count, limit, offset } }`  
**Auth:** Bearer token

#### PATCH /notifications/{notification_id}/read
**Response:** `{ success, data: { id, is_read: true } }`  
**Auth:** Bearer token (own notifications)

#### POST /notifications/mark-all-read
**Response:** `{ success, data: { marked_read: integer }, message }`  
**Auth:** Bearer token

#### POST /notifications/send
**Request:** `{ recipient_ids: [int], title: string, message: string, notification_type: string }`  
**Response:** `{ success, data: { sent_count, notification_ids }, message }`  
**Auth:** Bearer token (LGA_COORDINATOR or STATE_OFFICIAL)

### 6.9 Feedback / Messages Endpoints

#### GET /feedback
**Query:** `?ward_id=&limit=50&offset=0`  
**Response:** `{ success, data: { messages: [{ id, ward_id, ward_name, sender, recipient, message, is_read, parent_id, created_at }], total, limit, offset } }`  
**Auth:** Bearer token (role-scoped visibility)

#### POST /feedback
**Request:** `{ message: string, ward_id?: int, recipient_id?: int, recipient_type?: "LGA"|"STATE"|"WDC", parent_id?: int }`  
**Response:** `{ success, data: { id, ward_id, sender_id, recipient_id, message, parent_id, created_at }, message }`  
**Auth:** Bearer token

#### PATCH /feedback/{feedback_id}/read
**Response:** `{ success, data: { id, is_read: true } }`  
**Auth:** Bearer token (recipient only)

### 6.10 Analytics Endpoints (STATE_OFFICIAL only)

#### GET /analytics/overview
**Query:** `?month=YYYY-MM`  
**Response:** `{ success, data: { month, state_summary: { total_lgas, total_wards, reports_submitted, reports_missing, submission_rate, total_meetings_held, total_attendees }, top_performing_lgas, low_performing_lgas } }`

#### GET /analytics/lga-comparison
**Query:** `?month=&sort_by=submission_rate&order=desc`  
**Response:** `{ success, data: { month, lgas: [{ lga_id, lga_name, official_ward_count, total_wards, reports_submitted, reports_missing, submission_rate, total_meetings, total_attendees }] } }`

#### GET /analytics/trends
**Query:** `?start_month=&end_month=&months=6&lga_id=`  
**Response:** `{ success, data: { period: { start, end }, trends: [{ month, total_wards, reports_submitted, submission_rate }] } }`

#### POST /analytics/ai-report
**Request:** `{ month: string, focus_areas?: [string], lga_ids?: [int] }`  
**Response:** `{ success, data: { report: { generated_at, month, executive_summary, key_findings, recommendations, lga_highlights } } }`

### 6.11 Investigation Endpoints (STATE_OFFICIAL only)

#### GET /investigations
**Query:** `?status_filter=&lga_id=&priority=&limit=20&offset=0`  
**Response:** `{ success, data: { investigations: [...], total, limit, offset } }`

#### POST /investigations
**Request:** `{ title: string, description: string, investigation_type: string, priority: string, lga_id?: int, ward_id?: int }`  
**Response:** `{ success, data: { id, title, ... }, message }`

#### GET /investigations/{investigation_id}
**Response:** Full investigation with LGA/ward/user details

#### PATCH /investigations/{investigation_id}
**Request:** `{ title?, description?, investigation_type?, priority?, status? }`  
**Response:** `{ success, data: { id, status, updated_at }, message }`

#### DELETE /investigations/{investigation_id}
**Response:** 204 No Content

### 6.12 Form Builder Endpoints

#### GET /forms/active
**Response:** `{ data: FormDefinition | null }`  
**Auth:** Bearer token

#### GET /forms
**Query:** `?status=&limit=50&offset=0`  
**Response:** List of form definitions  
**Auth:** Bearer token (STATE_OFFICIAL)

#### POST /forms
**Request:** `{ name: string, description?: string, definition: { sections, fields } }`  
**Response:** FormDefinition  
**Auth:** Bearer token (STATE_OFFICIAL)

#### GET /forms/{form_id}
**Response:** FormDefinition  
**Auth:** Bearer token (STATE_OFFICIAL)

#### PUT /forms/{form_id}
**Request:** `{ name?, description?, definition? }`  
**Response:** FormDefinition (DRAFT only)  
**Auth:** Bearer token (STATE_OFFICIAL)

#### POST /forms/{form_id}/deploy
**Response:** FormDefinition with status "DEPLOYED"  
**Auth:** Bearer token (STATE_OFFICIAL)

### 6.13 User Management Endpoints (STATE_OFFICIAL only)

#### POST /users/assign
**Request:** `{ full_name, email, phone, password?, role: "LGA_COORDINATOR"|"WDC_SECRETARY", lga_id?, ward_id? }`  
**Response:** `{ success, message, user, credentials: { email, password }, sms_sent }`

#### GET /users/summary
**Response:** `{ total_lgas, total_wards, total_coordinators, active_coordinators, total_secretaries, active_secretaries, unassigned_lgas, unassigned_wards }`

#### GET /users/lga-wards/{lga_id}
**Response:** List of ward objects

#### GET /users/coordinator/{lga_id}
**Response:** `{ user: UserDetail }`

#### GET /users/secretary/{ward_id}
**Response:** `{ user: UserDetail }`

#### PATCH /users/{user_id}
**Request:** `{ full_name?, phone? }`  
**Response:** `{ success, message, user }`

#### PATCH /users/{user_id}/password
**Request:** `{ new_password: string }`  
**Response:** `{ success, message }`

#### PATCH /users/{user_id}/access
**Request:** `{ is_active: boolean }`  
**Response:** `{ success, message }`

### 6.14 Admin Utility Endpoints (STATE_OFFICIAL only)

#### POST /admin/update-state-executive-name
**Response:** `{ success, message, old_name, new_name, email }`

#### POST /admin/update-lgas-wards
**Response:** `{ success, message, lgas: { updated, created, total }, wards: { total, per_lga } }`

### 6.15 Health & System Endpoints

#### GET /health
**Response:** `{ success, data: { status: "healthy", timestamp, version: "1.0.0", database: "connected", cors_enabled: true } }`  
**Auth:** None

#### GET /app/version
**Response:** `{ version: "1.2.0", min_version: "1.0.0", message?: string }`  
**Auth:** None (used by native app version checking)

---

## Appendix A: Data Models

### UserResponse
```json
{
  "id": integer,
  "email": string,
  "full_name": string,
  "phone": string,
  "role": "WDC_SECRETARY" | "LGA_COORDINATOR" | "STATE_OFFICIAL",
  "is_active": boolean,
  "ward_id": integer | null,
  "ward_name": string | null,
  "lga_id": integer | null,
  "lga_name": string | null,
  "last_login": datetime | null,
  "created_at": datetime
}
```

### ReportResponse
```json
{
  "id": integer,
  "ward_id": integer,
  "ward_name": string,
  "user_id": integer,
  "secretary_name": string,
  "report_month": string,
  "meetings_held": integer,
  "attendees_count": integer,
  "issues_identified": string | null,
  "actions_taken": string | null,
  "challenges": string | null,
  "recommendations": string | null,
  "additional_notes": string | null,
  "report_data": object | null,
  "status": "DRAFT" | "SUBMITTED" | "REVIEWED" | "FLAGGED" | "DECLINED",
  "has_voice_note": boolean,
  "voice_notes": [{ id, field_name, file_path, duration }],
  "group_photo_path": [string],
  "reviewed_by": integer | null,
  "reviewed_at": datetime | null,
  "decline_reason": string | null,
  "submitted_at": datetime | null,
  "created_at": datetime,
  "updated_at": datetime
}
```

### Token Configuration
- Access token lifetime: 15 minutes
- Refresh token lifetime: 365 days
- Algorithm: HS256
- Client refresh buffer: 60 seconds before expiry
- Offline grace period: 5 minutes

---

## Appendix B: Storage Keys

| Key | Storage | Purpose |
|-----|---------|---------|
| `wdc-auth-db` (IndexedDB) | Browser | Refresh token + user profile |
| `wdc_color_scheme` | localStorage | Dark/light mode preference |
| `wdc_submit_queue` | Capacitor Preferences | Offline submission queue |
| `wdc_last_activity` | Capacitor Preferences | Session idle tracking |
| `wdc_form_activity` | Capacitor Preferences | Form editing state |
| `wdc_draft:{userId}:{wardId}:{reportMonth}` | Capacitor Preferences | Form draft auto-save |

---

## Appendix C: File Upload Constraints

| Type | Max Size | Accepted Formats |
|------|---------|-----------------|
| Voice Notes | 10 MB | .mp3, .m4a, .wav, .ogg, .webm |
| Photos | 10 MB | .jpg, .jpeg, .png, .webp |

---

## Appendix D: Responsive Breakpoints

| Breakpoint | Min Width | Usage |
|-----------|-----------|-------|
| (default) | 0px | Mobile-first base |
| sm | 640px | Small tablets |
| md | 768px | Tablets |
| lg | 1024px | Desktop (sidebar visible) |
| xl | 1280px | Wide desktop |

---

## Appendix E: Constants & Enums

### User Roles
`WDC_SECRETARY`, `LGA_COORDINATOR`, `STATE_OFFICIAL`

### Report Statuses
`DRAFT`, `SUBMITTED`, `REVIEWED`, `FLAGGED`, `DECLINED`

### Investigation Statuses
`OPEN`, `IN_PROGRESS`, `CLOSED`

### Investigation Priorities
`LOW`, `MEDIUM`, `HIGH`, `URGENT`

### Investigation Types
`PERFORMANCE`, `FINANCIAL`, `COMPLAINT`, `AUDIT`, `OTHER`

### Notification Types
`REPORT_MISSING`, `REPORT_SUBMITTED`, `REPORT_REVIEWED`, `FEEDBACK`, `REMINDER`, `SYSTEM`

### Pagination Defaults
- Default limit: 10
- Default offset: 0
- Max limit: 100
