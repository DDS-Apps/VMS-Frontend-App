export interface ParsedAuthTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    department?: string;
    autoApproval?: boolean;
    timezone?: string;
  };
  error?: string;
}

export function parseAuthHashFragment(hash: string): ParsedAuthTokens {
  try {
    const hashPart = hash.startsWith('#') ? hash.substring(1) : hash;
    if (!hashPart) return {};

    const params: Record<string, string> = {};
    hashPart.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });

    const accessToken = params.access_token || params.token;
    const refreshToken = params.refresh_token;
    const expiresInStr = params.expires_in;
    const error = params.error;

    let user: ParsedAuthTokens['user'];
    const userId = params.user_id;
    const userEmail = params.user_email;
    const userName = params.user_name;
    const userRole = params.user_role;
    const userDepartment = params.user_department;
    const userAutoApproval = params.user_auto_approval;
    const userTimezone = params.user_timezone;

    if (userId && userEmail) {
      user = {
        id: userId,
        email: userEmail,
        name: userName || '',
        role: userRole || '',
        department: userDepartment,
        autoApproval: userAutoApproval === 'true',
        timezone: userTimezone,
      };
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInStr ? parseInt(expiresInStr, 10) : undefined,
      user,
      error,
    };
  } catch (err) {
    console.error('[AuthTokenParser] Error parsing hash fragment:', err);
    return {};
  }
}

export function parseAuthUrl(url: string): ParsedAuthTokens {
  try {
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return {};
    
    const hashPart = url.substring(hashIndex + 1);
    return parseAuthHashFragment(hashPart);
  } catch (err) {
    console.error('[AuthTokenParser] Error parsing auth URL:', err);
    return {};
  }
}

export function clearUrlHash(): void {
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    const url = window.location.href.split('#')[0];
    window.history.replaceState({}, document.title, url);
  }
}
