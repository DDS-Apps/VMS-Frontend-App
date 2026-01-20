/**
 * App Entry Point
 * ================
 * 
 * CRITICAL: RTL initialization MUST happen before React renders!
 * 
 * The initializeRTL() call configures I18nManager before any component
 * mounts. This is essential for proper RTL layout on mobile.
 */

import { registerRootComponent } from "expo";

// Step 1: Initialize RTL BEFORE any React code runs
import { initializeRTL } from "@/utils/rtl";
initializeRTL();

// Step 2: Now import and register the app
import App from "@/App";

registerRootComponent(App);
