/**
 * Mock Authentication Service
 * This service simulates authentication functionality until real APIs are integrated.
 */

export interface AuthResult {
  success: boolean;
  message?: string;
  token?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Simulated delay for API calls
const simulateDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock user database
const mockUsers: Record<string, { password: string; user: User }> = {
  'employee@dallah.com': {
    password: 'password123',
    user: { id: '1', email: 'employee@dallah.com', name: 'Renad', role: 'employee' }
  },
  'manager@dallah.com': {
    password: 'password123',
    user: { id: '2', email: 'manager@dallah.com', name: 'John Smith', role: 'manager' }
  },
  'admin@dallah.com': {
    password: 'password123',
    user: { id: '3', email: 'admin@dallah.com', name: 'Admin User', role: 'building_admin' }
  }
};

// Store for password reset codes (in-memory, resets on app restart)
const resetCodes: Record<string, { code: string; expiry: number }> = {};

/**
 * Login with email and password
 */
export const login = async (email: string, password: string): Promise<AuthResult> => {
  await simulateDelay();
  
  const normalizedEmail = email.toLowerCase().trim();
  const userRecord = mockUsers[normalizedEmail];
  
  if (!userRecord) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  if (userRecord.password !== password) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  return { 
    success: true, 
    token: `mock-jwt-token-${Date.now()}`,
    message: 'Login successful'
  };
};

/**
 * Request password reset code
 */
export const requestPasswordReset = async (email: string): Promise<AuthResult> => {
  await simulateDelay();
  
  // Generate a 4-digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry
  
  // Store the code (in real app, this would be sent via email)
  resetCodes[email.toLowerCase().trim()] = { code, expiry };
  
  // For demo purposes, log the code (in production, this would be sent via email)
  console.log(`[Mock Auth] Password reset code for ${email}: ${code}`);
  
  return { 
    success: true, 
    message: `Reset code sent to ${email}. (Demo: check console for code)`
  };
};

/**
 * Verify password reset code
 */
export const verifyResetCode = async (email: string, code: string): Promise<AuthResult> => {
  await simulateDelay(500);
  
  const normalizedEmail = email.toLowerCase().trim();
  const storedData = resetCodes[normalizedEmail];
  
  if (!storedData) {
    return { success: false, message: 'No reset code found. Please request a new one.' };
  }
  
  if (Date.now() > storedData.expiry) {
    delete resetCodes[normalizedEmail];
    return { success: false, message: 'Reset code has expired. Please request a new one.' };
  }
  
  // For demo, accept any 4-digit code or the correct code
  if (code.length >= 4) {
    return { success: true, message: 'Code verified' };
  }
  
  return { success: false, message: 'Invalid verification code' };
};

/**
 * Reset password with verified code
 */
export const resetPassword = async (
  email: string, 
  code: string, 
  newPassword: string
): Promise<AuthResult> => {
  // First verify the code
  const verifyResult = await verifyResetCode(email, code);
  if (!verifyResult.success) {
    return verifyResult;
  }
  
  await simulateDelay(500);
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Update password in mock database if user exists
  if (mockUsers[normalizedEmail]) {
    mockUsers[normalizedEmail].password = newPassword;
  }
  
  // Clear the reset code
  delete resetCodes[normalizedEmail];
  
  return { 
    success: true, 
    message: 'Password reset successful. You can now login with your new password.'
  };
};

/**
 * Logout (clear session)
 */
export const logout = async (): Promise<AuthResult> => {
  await simulateDelay(300);
  return { success: true, message: 'Logged out successfully' };
};
