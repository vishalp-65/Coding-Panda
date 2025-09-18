export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly EXPIRES_IN_KEY = 'expiresIn';
  private static readonly TOKEN_TIMESTAMP_KEY = 'tokenTimestamp';

  static setTokens(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ) {
    console.log({ accessToken, refreshToken, expiresIn });
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.EXPIRES_IN_KEY, expiresIn.toString());
    localStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(): boolean {
    const timestamp = localStorage.getItem(this.TOKEN_TIMESTAMP_KEY);
    const expiresIn = localStorage.getItem(this.EXPIRES_IN_KEY);
    const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);

    if (!timestamp || !expiresIn || !accessToken) {
      return true;
    }

    const tokenAge = Date.now() - parseInt(timestamp);
    const expirationTime = parseInt(expiresIn) * 1000; // Convert to milliseconds

    // Consider token expired if it's 90% of the way to expiration
    return tokenAge >= expirationTime * 0.9;
  }

  static clearTokens() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_IN_KEY);
    localStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
  }

  static hasValidToken(): boolean {
    const accessToken = this.getAccessToken();
    return accessToken !== null && !this.isTokenExpired();
  }

  static hasRefreshToken(): boolean {
    const refreshToken = this.getRefreshToken();
    return refreshToken !== null;
  }
}
