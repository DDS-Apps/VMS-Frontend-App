# Dallah Albaraka Visitor Management System - Design Guidelines

## Design Approach: Material Design with Brand Customization
Utility-focused mobile application requiring consistent patterns, clear hierarchies, and efficient data input/display workflows.

## Typography System
**Primary Font:** Inter or SF Pro (native-feeling)
- **Headings:** 24px/28px bold for screen titles
- **Subheadings:** 18px/20px semibold for sections
- **Body:** 16px/24px regular for content
- **Labels:** 14px/20px medium for form labels
- **Captions:** 12px/16px regular for helper text

## Layout System
**Spacing Units:** Use multiples of 4 (8, 12, 16, 24, 32, 40)
- Screen padding: 16px horizontal, 24px vertical
- Card padding: 16px
- Section spacing: 24px between major sections
- Input spacing: 12px between form fields
- List item spacing: 16px vertical padding

## Component Library

### Navigation
**Bottom Tab Bar:** Primary navigation (Home, Visitors, History, Settings)
- Height: 64px
- Active tab: Brand Orange icon + label
- Inactive: Grey with opacity
- Safe area aware

**Top App Bar:** Screen-specific
- Height: 56px
- Title: 18px semibold, centered or left-aligned
- Icons: 24px (back, menu, notifications)
- Background: White (light) / Grey (#282829 dark)

### Cards & Containers
**Visitor Cards:** Rounded 12px corners
- Border: 1px solid rgba(0,0,0,0.08) light / rgba(255,255,255,0.12) dark
- Shadow: Subtle elevation (4dp equivalent)
- Content hierarchy: Name (18px bold), Company (14px), Time (12px grey)
- Status badge: Pill shape, 8px padding, Brand Green for checked-in

**Status Badges:** Rounded-full, 6px padding horizontal
- Active: Brand Green background, white text
- Pending: Brand Orange background, white text
- Completed: Grey background, white text

### Forms & Input
**Text Inputs:** 
- Height: 48px minimum touch target
- Border radius: 8px
- Border: 1px solid rgba(0,0,0,0.12)
- Focus: 2px Brand Orange border
- Label above input (14px medium)
- Error state: Red border with helper text below

**Buttons:**
**Primary CTA:** Brand Orange background, white text, 48px height, 12px radius, 16px padding
**Secondary:** White background, Brand Orange border/text
**Tertiary:** Text only, no background
**Danger:** Red background for delete/cancel actions

### Loading Overlay (Language Switching)
Full-screen overlay with:
- Background: rgba(0,0,0,0.7) dark / rgba(255,255,255,0.9) light
- Centered spinner: Brand Orange accent
- Text below spinner: "Switching language..." (16px)
- Blur effect on background content

### Lists & Data Display
**Visitor List Items:**
- 72px height minimum
- Avatar/Photo: 48px circle on left
- Text hierarchy: Name bold, metadata stacked
- Right chevron or action buttons
- Dividers: 1px rgba(0,0,0,0.08)

**Empty States:** 
- Centered icon (64px, grey)
- Message (16px) + Helper text (14px grey)
- Optional CTA button below

### Modals & Bottom Sheets
**Bottom Sheets:** Preferred for actions/forms
- Rounded top corners: 16px
- Drag handle: 32px wide, 4px thick, centered
- Max height: 90% screen

## Color Application
**Light Mode:**
- Background: #FFFFFF
- Surface: #F8F9FA
- Text Primary: #282829
- Text Secondary: rgba(40,40,41,0.6)

**Dark Mode:**
- Background: #121212
- Surface: #1E1E1E
- Text Primary: #FFFFFF
- Text Secondary: rgba(255,255,255,0.7)

**Accents:** Use Brand Orange for primary actions, Brand Green for success/status, Brand Grey for neutrals

## Images
**Profile/Visitor Photos:** 
- Circular avatars throughout (48px standard, 64px profile view)
- Placeholder: Brand Grey with white initials

**No large hero images** - This is a utility app focused on data entry and management workflows. All imagery is functional (avatars, badges, QR codes).

## Animations
- Screen transitions: 250ms ease-in-out
- Modal/sheet entry: Spring animation (native feeling)
- Button press: Scale 0.97 feedback
- Theme toggle: Smooth 300ms cross-fade