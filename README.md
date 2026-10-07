# CK Auto APK - Master Blueprint (SRS)

## 1. Onboarding & Authentication
- **Entry Screen:** User chooses [Sign Up] or [Login].
- **Sign Up:** Full Name, Business Name (Optional), Phone (`07...`), Email (Must be `@gmail` or `@outlook`), User ID (Default initials like `ck`, but editable), Password.
- **Login:** Phone/Email + Password.
- **Permissions Wizard:** SMS, Phone/Call, Contacts, Accessibility Service, Battery Unrestricted, Notifications, Storage (all required for automation).

## 2. Global UI Rules
- **Toggle Format:** `1` when ON, `0` when OFF.
- **Greyed Out:** When Automation Power is OFF (`0`), all associated UI elements are greyed out/disabled.
- **Hide/Unhide:** Eye icons default to hidden (`****`) for Airtime, Commission, Tokens, and Time. Synced across all pages.
- **Home Activity:** Max 6 items shown. "See all" and "View Statistics" jump to the Txns page.
- **Background Notification:** "CK Auto is running" appears when ON, disappears instantly when OFF. Monochrome "CK" icon in status bar, colorful icon when pulled down.

## 3. Core Selling & USSD Automation
- **Data Deals:** Dial `*180*5*2*[Phone]#` -> Select Offer -> Select Airtime. No manual fallback.
- **Dynamic Offers (SMS/Advanced):** User inputs USSD code (e.g., `*544#`) + Keywords (Case-insensitive). "Read Menu First" rule applies (never guess numbers).
- **Send Money to...:** Unified page for P2P, Pochi la Biashara, Paybill, Buy Goods, Send from Till. 
    - *P2P:* `*334#` -> Send Money -> Any Network / Pochi la Biashara -> Phone -> Amount -> PIN.
    - *Paybill:* `*334#` -> Lipa na M-PESA -> Paybill -> Business No -> Account No -> Amount -> PIN.
    - *Buy Goods:* `*334#` -> Lipa na M-PESA -> Buy Goods -> Till No -> Amount -> PIN.
    - *Send from Till:* `*234*2*5822712*2*3*pn*amount#` -> User ID (`ck`) -> PIN -> Stop for user confirmation.
- **Stop & Confirm:** All flows stop at the final confirmation screen. The user manually presses "Send" or "1".
- **Security:** PINs are never saved, only held in memory for the transaction.

## 4. Transactions & Statistics
- **Txns Page:** Summary cards (Total, Success, Failed, Total Ksh, True Profit). Weekly reset on Sunday. Search & Filters (ALL, SUCCESS, FAILED, QUEUED, PENDING, SENT). Accordion view with sticky header, unmasked data, Call @LastName, SMS @LastName, Retry, Schedule, Mark Success.
- **Stats Page:** Daily/Weekly/Monthly filters. Total Sales, Commission (10%), True Profit. Clients Served vs. New. Offer Comparison (Normal=Data Deals, Advanced=Others). Donut chart. Sales by Offer bar charts.
- **True Profit Formula:** `(Selling Price + Commission) - Wholesale Cost`.

## 5. Monetization (Tokens & Time)
- **Rates:** 1 Ksh = 10 Tokens. 20 Ksh = 1 Day Unlimited.
- **Owner Exemption:** Owner account (`0757929759`) is exempt.
- **Airtime Purchase:** `*140*amount*0757929759#` silently.
- **M-Pesa Purchase:** `*334#` -> 6 -> 2 -> Till `3661950` -> Amount -> Stop at PIN. Waits 46s (up to 5 mins) for SMS. 46s lock on tokens.
- **Blocked Amounts:** 10, 20, 30, 55 are automatically adjusted to 11, 21, 31, 56 for the Till transaction.

## 6. Communication & Scheduling
- **SMS Page:** Merged Promo SMS and Inbox/Test. `@name` tag for personalization. SIM selection. Test parser tools.
- **Schedule Offers:** "+" FAB to add date/time/offer/recipients.
- **Airtime Manager:** Check `*144#` silently. Warn below limit (synced with Emergency).

## 7. Emergency & Alerts
- **Trigger:** Low Airtime, Low Battery, Max Consecutive Failed Sales.
- **UI:** Passive red banner (non-blocking). Tapping it navigates to the fix page.
- **Audio/Vibration:** 15-second vibration. No audio.
- **Settings:** Alert phone, Min Airtime, Min Battery, Max Failed Sales, Retry count (default 3, 30s apart).

## 8. Profile & Backup
- **You Page:** Profile details, Tokens/Time with hide/unhide, Change Photo (File Manager permission), Edit Profile, Change Password, Logout (with confirmation).
- **Backup:** Includes Tokens/Time, Settings, Offers, Contacts. Excludes PINs/Passwords. Warning before Restore.
- **Dynamic User ID:** Generated from initials, editable.

## 9. Offer Color-Coding Rules
- 🟢 **Green:** Offer is **ON** and **Verified**. (Ready to sell).
- 🔴 **Red:** Offer is **Unverified**. (Cannot be turned on).
- 🟡 **Yellow:** Offer is **OFF** but **Verified**. (Paused).
