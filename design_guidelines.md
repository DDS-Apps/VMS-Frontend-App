# DALLAH DIGITAL - Visitor Management System Design Guidelines

## Overview
A modern, mobile-first Visitor Management System (VMS) for enterprise environments. Supports visitor requests, parking management, valet services, buffet bookings, and real-time notifications. Branded with the **DALLAH DIGITAL** design system.

## Brand Identity

### Color Palette

**Brand Core Colors**:
- Brand Blue: `#307BF2` - Primary CTAs, buttons, links, highlights
- Brand Teal: `#12E1D5` - Secondary accent, highlights, badges, progress
- Brand Navy: `#041A3A` - Primary text on light surfaces, headers, icons
- Soft Teal: `#E4FCF9` - Subtle accent backgrounds for cards/info

**Neutral Colors**:
- Grey 900: `#526178` - Secondary text, muted icons
- Grey 300: `#C7CCD3` - Borders, dividers, input outlines
- Grey 200: `#DFE2E6` - Card borders, subtle surfaces
- Grey 50: `#F5F7FA` - Page/app background
- White: `#FFFFFF` - Surfaces, cards, modals, inputs

**Status Colors**:
- Success: `#1BBE7A` - Approved, confirmed states
- Warning: `#FFA000` - Pending, awaiting action
- Error: `#E53935` - Rejected, cancelled
- Info: `#307BF2` - Informational messages (uses Brand Blue)

**Light Mode Theme**:
- Primary: Brand Blue `#307BF2`
- Secondary: Brand Teal `#12E1D5`
- Background: Grey 50 `#F5F7FA`
- Surface: White `#FFFFFF`
- Text Primary: Brand Navy `#041A3A`
- Text Secondary: Grey 900 `#526178`
- Border: Grey 200 `#DFE2E6`
- Sidebar Background: Brand Navy `#041A3A`

**Dark Mode Theme**:
- Primary: Brand Teal `#12E1D5`
- Secondary: Brand Blue `#307BF2`
- Background: `#0A1628`
- Surface: `#112240`
- Text Primary: White `#FFFFFF`
- Text Secondary: `#94A3B8`
- Border: `#2A4060`
- Sidebar Background: `#0A1628`

### Typography

- **Display (32px, Bold)**: Screen titles, hero text
- **Title (24px, Semibold)**: Section headers
- **Subtitle (20px, Semibold)**: Card titles, subsections
- **Body Large (18px, Regular)**: Important body text
- **Body (16px, Regular)**: Standard body text
- **Body Small (14px, Regular)**: Secondary information
- **Caption (12px, Regular)**: Labels, timestamps
- **Label (12px, Medium)**: Form labels, tags

### Spacing

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- xxl: 32px
- xxxl: 48px

### Border Radius

- xs: 4px - Small elements
- sm: 8px - Buttons, inputs
- md: 12px - Cards, containers
- lg: 16px - Modals, large cards
- xl: 20px - Feature cards
- xxl: 24px - Extra large cards
- full: 9999px - Pills, avatars

## User Roles & Screens

### 1. Employee (Initiator)
**Primary Screens**:
- Dashboard: View my requests, quick stats
- Request Visitor: Form with visitor details, optional services
- Request Details: View/edit/cancel pending requests
- Notifications: Visitor acceptance, reminders, status updates

**Key Features**:
- Quick action button for new request
- Status badges (Pending, Approved, Checked-In, Completed, Cancelled)
- Timeline view of visitor journey
- QR code sharing

### 2. Building Admin
**Primary Screens**:
- Dashboard: Parking overview, utilization stats
- Parking Management: View/assign parking slots
- Valet Area Management: Configure valet zones
- Reports: Parking usage analytics

**Key Features**:
- Real-time parking availability map
- Manual slot assignment
- Override auto-assignments
- Capacity planning tools

### 3. Buffet Admin
**Primary Screens**:
- Dashboard: Today's buffet bookings
- Staff Management: Assign buffet staff
- Location Management: Configure buffet areas
- Menu/Capacity Settings

**Key Features**:
- Staff availability calendar
- Booking timeline view
- Capacity alerts
- Dietary preferences tracking

### 4. Valet Admin
**Primary Screens**:
- Dashboard: Active valet requests, driver status
- Driver Management: Assign/reassign tasks
- Workload Balancing: View driver assignments
- Task Queue: Pending pickup/return requests

**Key Features**:
- Driver availability status
- Accept/reject notifications
- Real-time task updates
- Performance metrics

### 5. Security Staff
**Primary Screens**:
- Dashboard: Today's expected visitors
- Check-In: QR scanner for visitor entry
- Walk-In Registration: Manual visitor entry
- Visitor Log: Search and view history

**Key Features**:
- QR code scanner
- Quick search by name/company
- Photo verification
- Entry/exit logging

## Core Screens

### Login Screen
- Company logo at top
- Email/password fields
- "Remember me" option
- Role-based login redirect
- Clean, minimal design

### Employee Dashboard
**Layout**:
- Header: Welcome message, notification bell
- Quick Stats Row: Active Requests, Upcoming Visits, Pending Actions
- FAB: "Request Visitor Access" (Primary CTA)
- Tabs: Upcoming | Past | All
- Request Cards: Visitor name, date/time, status, services icons

**Request Card Design**:
- Left border color = status (Orange: pending, Green: approved, Red: cancelled)
- Visitor avatar/initials
- Visitor name + company
- Date/time with calendar icon
- Service icons: Parking, Meeting Room, Buffet, Valet
- Status badge
- Action buttons (View Details, Cancel)

### Visitor Request Form
**Sections**:
1. **Visitor Information**
   - Full name (required)
   - Email (required)
   - Phone (required)
   - Company name
   - Photo upload (optional)

2. **Visit Details**
   - Visit date (date picker)
   - Visit time (time picker)
   - Duration (dropdown: 1h, 2h, 4h, Full Day)
   - Purpose of visit (text area)

3. **Optional Services** (Toggle cards):
   - Meeting Room (select room, time slot)
   - Parking (auto/valet preference)
   - Buffet (meal type, dietary preferences)
   - Valet Service (pickup/return times)

4. **Additional Visitors** (Expandable):
   - Add multiple visitors
   - Bulk upload option

**Form Design**:
- Progressive disclosure
- Input validation with inline errors
- Save as draft option
- Preview before submit
- Clear section dividers

### Request Details Screen
**Layout**:
- Header: Back button, visitor name, status badge
- Visitor Info Card: All details, photo
- Timeline: Request submitted → Approved → Visitor accepted → Checked in → Completed
- Services Section: Detailed breakdown of parking, buffet, valet, meeting room
- QR Code: Share with visitor
- Action Buttons: Edit (if pending), Cancel, Resend Invitation

### Admin Dashboard (Generic Template)
**Layout**:
- Top KPI Cards: 4 metrics (customized per role)
- Filter Bar: Date range, status, search
- Main Content Area: List/grid/calendar view toggle
- Right Sidebar: Quick actions, recent activity

**KPI Card Design**:
- Large number at top
- Label below
- Small trend indicator (↑ 12% from last week)
- Icon representing metric
- Color-coded based on status

### Check-In Screen (Security)
**QR Scanner View**:
- Large camera viewfinder
- Scanning instructions
- Manual entry option at bottom

**After Scan**:
- Visitor details display
- Services allocated (parking slot, buffet location, valet driver)
- Confirm check-in button
- Add notes field
- Photo verification

### Notification Center
**Layout**:
- Tabs: All | Unread | Important
- Notification Cards:
  - Icon + color for notification type
  - Title (bold)
  - Description
  - Timestamp
  - Action buttons (if applicable)
  - Mark as read

**Notification Types**:
- Visitor Accepted: Green, checkmark icon
- Visitor Rejected: Red, x icon
- Reminder: Orange, bell icon
- Check-in: Blue, door icon
- Update: Yellow, info icon

## Interactive Elements

### Buttons

**Primary Button**:
- Background: Brand Blue `#307BF2`
- Text: White
- Height: 48px
- Border radius: pill (9999px)
- Font: 16px, Inter Medium
- Active state: scale 0.96 with spring animation
- Disabled: 0.5 opacity

**Secondary Button**:
- Background: Brand Teal `#12E1D5`
- Text: White
- Same dimensions as primary

**Outline Button**:
- Background: Transparent
- Border: 1.5px solid Brand Blue
- Text: Brand Blue
- Same dimensions as primary

**Ghost Button**:
- No border/background
- Text: Brand Blue
- For subtle actions

**Danger Button**:
- Background: Error Red `#E53935`
- Text: White
- Same dimensions as primary

### Status Badges

- **Pending**: Warning Orange `#FFA000` background, white text
- **Approved**: Success Green `#1BBE7A` background, white text
- **Rejected**: Error Red `#E53935` background, white text
- **Checked In**: Brand Blue `#307BF2` background, white text
- **Completed**: Brand Teal `#12E1D5` background, dark text
- **Cancelled**: Grey `#526178` background, white text

Pill shape, 8px padding, 12px font size, medium weight

### Cards

**Standard Card**:
- Background: Surface color
- Border radius: 12px
- Padding: 16px
- 1px border in light mode
- No shadow (flat design)
- Pressable: 0.95 scale on press

**Feature Card** (Larger):
- Border radius: 16px
- Padding: 24px
- Optional left accent border (4px, colored)

### Form Inputs

**Text Input**:
- Height: 48px
- Border: 1px solid border color
- Border radius: 8px
- Padding: 12px
- Focus: Primary color border
- Error: Red border + error text below

**Date/Time Picker**:
- Calendar icon on right
- Same styling as text input
- Opens native picker

**Toggle Switch**:
- iOS-style switch
- On: Primary orange
- Off: Gray

**Dropdown/Select**:
- Chevron icon on right
- Same styling as text input

## Layout Patterns

### Screen Layout

All screens follow this pattern:
- Header (fixed): 60px height, title centered, back/action buttons
- Content: Scrollable, padding 16px horizontal
- Bottom Tab Bar (if applicable): 60px height, blurred background

### Safe Areas

- Top padding: Header height + 16px
- Bottom padding: Tab bar height + 16px (or safe area inset + 16px if no tabs)
- Horizontal padding: 16px on all screens

### Grid System

- 2-column grid for cards on larger screens
- Single column on mobile
- 12px gap between items

## Accessibility

- Minimum touch target: 44x44px
- Color contrast: 4.5:1 for text
- All icons have labels
- Form inputs have clear labels
- Error messages are descriptive
- Support for screen readers

## Animation & Transitions

- Page transitions: Slide (300ms)
- Modal appearance: Fade + slide up (250ms)
- Button press: Scale 0.95 (100ms)
- Card press: Scale 0.98 (100ms)
- Loading states: Skeleton screens or spinner

## Icons

Use Feather icons consistently:
- User, users, user-plus
- Calendar, clock
- Map-pin, navigation (parking/location)
- Truck (valet)
- Coffee (buffet)
- Bell (notifications)
- Check-circle, x-circle (status)
- QrCode (QR codes)
- Settings, menu

## Special Components

### QR Code Display
- Centered in card
- 200x200px size
- Download/share buttons below
- Visitor name and visit details above

### Service Icon Pills
- Small circular icons (32px)
- Background matches service type
- Displayed horizontally in request cards

### Timeline Component
- Vertical line connecting steps
- Checkmarks for completed
- Current step highlighted
- Future steps grayed out

### Empty States
- Large icon (64px)
- Descriptive text
- Call-to-action button
- Centered in available space

## Platform Considerations

### iOS Specific
- Use native navigation bar blur
- SF Symbols where available
- Haptic feedback on actions

### Android Specific
- Material ripple effects
- Edge-to-edge layout
- System navigation awareness

### Web Specific
- Hover states for interactive elements
- Keyboard navigation support
- Responsive breakpoints (mobile, tablet, desktop)

## Design Principles

1. **Clarity First**: Every screen has one primary action
2. **Progressive Disclosure**: Show only what's needed
3. **Consistent Patterns**: Similar actions look and behave the same
4. **Feedback**: Always confirm actions with visual/haptic feedback
5. **Efficiency**: Minimize steps to complete tasks
6. **Error Prevention**: Validate inputs, confirm destructive actions
7. **Mobile-First**: Optimize for mobile, enhance for larger screens
