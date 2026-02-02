# Environment Configuration

This folder contains environment configuration utilities and documentation.

## Overview

The VMS app supports two environments:

| Environment | Git Branch | Firebase Project | Description |
|-------------|-----------|------------------|-------------|
| **Production** | `main` | `dallahdigital-vms` | Live production environment |
| **QA** | `qa` | `dallah-albaraka-vms` | Testing/QA environment |

## Setup Instructions

### For Production (Current Replit Project)

The production environment is already configured in this Replit project.

### For QA (New Replit Project Required)

Since Replit only supports one deployment per project, you need to create a separate Replit project for QA:

1. **Create new Replit project** (e.g., `dallah-vms-qa`)
2. **Connect to `qa` git branch**
3. **Add all environment variables** from the QA configuration below

## Environment Variable Reference

### Production Environment
| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://vms-backend-folio3.replit.app` |
| `EXPO_PUBLIC_VMS_API_BASE_URL` | `https://vms-backend-folio3.replit.app/api` |
| `EXPO_PUBLIC_MICROSOFT_AUTH_URL` | `https://vms-backend-folio3.replit.app` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `dallahdigital-vms` |

### QA Environment
| Variable | Value |
|----------|-------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://vms-backend-folio3.replit.app` |
| `EXPO_PUBLIC_VMS_API_BASE_URL` | `https://vms-backend-folio3.replit.app` |
| `EXPO_PUBLIC_MICROSOFT_AUTH_URL` | `https://vms-backend-folio3.replit.app` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `dallah-albaraka-vms` |

## Required Environment Variables

Add these in Replit Secrets for each environment:

### Backend Configuration
```
EXPO_PUBLIC_API_BASE_URL          # Base API URL
EXPO_PUBLIC_VMS_API_BASE_URL      # VMS API endpoint  
EXPO_PUBLIC_MICROSOFT_AUTH_URL    # Microsoft OAuth URL
```

### Firebase Configuration
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
```

### Firebase App IDs (Platform-specific)
```
EXPO_PUBLIC_FIREBASE_APP_ID_WEB
EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID
EXPO_PUBLIC_FIREBASE_APP_ID_IOS
```

### Push Notifications
```
EXPO_PUBLIC_FIREBASE_VAPID_KEY
```

## Files

- `environments.ts` - TypeScript utilities for environment detection and validation
- `README.md` - This documentation file

## Usage in Code

```typescript
import { 
  getCurrentEnvironment, 
  getEnvironmentConfig,
  validateEnvironmentConfig 
} from '@/config/environments';

// Detect current environment
const env = getCurrentEnvironment(); // 'production' | 'qa' | 'unknown'

// Get full config from env vars
const config = getEnvironmentConfig();

// Validate all required vars are set
const missing = validateEnvironmentConfig();
if (missing.length > 0) {
  console.warn('Missing environment variables:', missing);
}
```

## Security Notes

- **NEVER** commit actual API keys or secrets to the repository
- All sensitive values should be stored in Replit Secrets
- The `environments.ts` file only contains structure definitions, not actual values
- Firebase project IDs are public identifiers and safe to include
