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
  errorDescription?: string;
}

function parseParams(paramsString: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!paramsString) return params;

  paramsString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });

  return params;
}

function extractTokensFromParams(params: Record<string, string>): ParsedAuthTokens {
  // Support both camelCase (accessToken) and snake_case (access_token)
  const accessToken = params.accessToken || params.access_token || params.token;
  const refreshToken = params.refreshToken || params.refresh_token;
  const expiresInStr = params.expiresIn || params.expires_in;
  const error = params.error;
  const errorDescription = params.errorDescription || params.error_description;

  let user: ParsedAuthTokens['user'];
  const userId = params.userId || params.user_id;
  const userEmail = params.userEmail || params.user_email;
  const userName = params.userName || params.user_name;
  const userRole = params.userRole || params.user_role;
  const userDepartment = params.userDepartment || params.user_department;
  const userAutoApproval = params.userAutoApproval || params.user_auto_approval;
  const userTimezone = params.userTimezone || params.user_timezone;

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
    errorDescription,
  };
}

export function parseAuthHashFragment(hash: string): ParsedAuthTokens {
  try {
    const hashPart = hash.startsWith('#') ? hash.substring(1) : hash;
    if (!hashPart) return {};

    const params = parseParams(hashPart);
    return extractTokensFromParams(params);
  } catch (err) {
    return {};
  }
}

export function parseAuthQueryString(queryString: string): ParsedAuthTokens {
  try {
    const queryPart = queryString.startsWith('?') ? queryString.substring(1) : queryString;
    if (!queryPart) return {};

    const params = parseParams(queryPart);
    return extractTokensFromParams(params);
  } catch (err) {
    return {};
  }
}

export function parseAuthUrl(url: string): ParsedAuthTokens {
  try {
    
    // First check for query parameters (?)
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      // Extract query string, stopping at hash if present
      const hashIndex = url.indexOf('#', queryIndex);
      const queryPart = hashIndex !== -1 
        ? url.substring(queryIndex + 1, hashIndex)
        : url.substring(queryIndex + 1);
      
      const result = parseAuthQueryString(queryPart);
      
      if (result.accessToken || result.error) {
          hasAccessToken: !!result.accessToken,
          hasError: !!result.error,
          error: result.error
        });
        return result;
      }
    }
    
    // Then check for hash fragment (#)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hashPart = url.substring(hashIndex + 1);
      const result = parseAuthHashFragment(hashPart);
      
      return result;
    }
    
    return {};
  } catch (err) {
    return {};
  }
}

export function clearUrlHash(): void {
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    const url = window.location.href.split('#')[0];
    window.history.replaceState({}, document.title, url);
  }
}
