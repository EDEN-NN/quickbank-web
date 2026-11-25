import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const SIGN_IN_REQUIRED = 'Sign in required';
const SESSION_KEY = 'quickbank.session';

interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}

interface Session {
  accessToken: string;
  refreshToken: string | null;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId,
  });
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private refreshInFlight: Promise<string> | null = null;

  readonly signedIn = signal(false);
  readonly username = signal<string | null>(null);
  readonly initError = signal<string | null>(null);
  private ready: Promise<void> | null = null;

  init(): Promise<void> {
    this.ready ??= this.start();
    return this.ready;
  }

  // Silent check-sso loads Keycloak inside an iframe. An error response from
  // that request is framed with X-Frame-Options: SAMEORIGIN, the iframe is
  // blocked, and init() never settles. The app used to wait on that promise
  // before painting, so / stayed white. The home form signs in through the API.
  private async start(): Promise<void> {
    try {
      const authenticated = await this.keycloak.init({
        pkceMethod: 'S256',
        checkLoginIframe: false,
        redirectUri: `${window.location.origin}/account`,
        scope: 'profile email',
        responseMode: 'query',
        enableLogging: !environment.production,
      });
      if (authenticated) {
        this.applySession(true);
        return;
      }
    } catch {
      this.initError.set(
        'Keycloak did not answer at ' +
          environment.keycloak.url +
          '. Start the Compose stack and reload this page.',
      );
    }
    if (await this.restore()) {
      return;
    }
    this.applySession(false);
  }

  login(username: string, password: string): Promise<void> {
    return this.store(this.post('/api/auth/login', { username, password }));
  }

  register(username: string, email: string, firstName: string, lastName: string, password: string): Promise<void> {
    return firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/api/auth/registrations`, {
        username,
        email,
        firstName,
        lastName,
        password,
      }),
    ).then(() => undefined);
  }

  signIn(): void {
    void this.init().then(() => {
      if (this.signedIn()) {
        return;
      }
      return this.keycloak.login({
        redirectUri: `${window.location.origin}/account`,
        scope: 'profile email',
      });
    });
  }

  signOut(): void {
    this.clearSession();
    if (this.keycloak.authenticated) {
      void this.keycloak.logout({ redirectUri: `${window.location.origin}/` });
      return;
    }
    this.signedIn.set(false);
    this.username.set(null);
    window.location.assign(`${window.location.origin}/`);
  }

  async ensureToken(): Promise<string> {
    if (this.keycloak.authenticated) {
      try {
        await this.keycloak.updateToken(30);
      } catch {
        this.signedIn.set(false);
        throw new Error(SIGN_IN_REQUIRED);
      }
      const token = this.keycloak.token;
      if (!token) {
        throw new Error(SIGN_IN_REQUIRED);
      }
      return token;
    }
    const session = this.readSession();
    if (!session) {
      throw new Error(SIGN_IN_REQUIRED);
    }
    const now = Math.floor(Date.now() / 1000);
    if (session.exp - now > 30) {
      return session.accessToken;
    }
    this.refreshInFlight ??= this.refresh(session).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private post(path: string, body: unknown): Promise<TokenResponse> {
    return firstValueFrom(this.http.post<TokenResponse>(`${environment.apiBaseUrl}${path}`, body));
  }

  private async store(pending: Promise<TokenResponse>): Promise<void> {
    const body = await pending;
    this.keep(body);
  }

  private async refresh(session: Session): Promise<string> {
    if (!session.refreshToken) {
      this.clearSession();
      this.signedIn.set(false);
      throw new Error(SIGN_IN_REQUIRED);
    }
    try {
      const body = await this.post('/api/auth/refresh', { refreshToken: session.refreshToken });
      this.keep(body);
      return body.accessToken;
    } catch {
      this.clearSession();
      this.signedIn.set(false);
      throw new Error(SIGN_IN_REQUIRED);
    }
  }

  private keep(body: TokenResponse): void {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (Number.isFinite(body.expiresIn) ? body.expiresIn : 300);
    const session: Session = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      exp,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.signedIn.set(true);
    this.username.set(preferredUsername(body.accessToken));
    this.armRefresh();
  }

  private async restore(): Promise<boolean> {
    const session = this.readSession();
    if (!session) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    if (session.exp - now > 30) {
      this.signedIn.set(true);
      this.username.set(preferredUsername(session.accessToken));
      this.armRefresh();
      return true;
    }
    if (!session.refreshToken) {
      this.clearSession();
      return false;
    }
    try {
      await this.refresh(session);
      return true;
    } catch {
      return false;
    }
  }

  private readSession(): Session | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Session;
      if (!parsed.accessToken || typeof parsed.exp !== 'number') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }

  private applySession(authenticated: boolean): void {
    this.signedIn.set(authenticated);
    if (!authenticated) {
      this.username.set(null);
      return;
    }
    const parsed = this.keycloak.tokenParsed;
    const name = parsed ? parsed['preferred_username'] : null;
    this.username.set(typeof name === 'string' && name.length > 0 ? name : null);
    this.armRefresh();
  }

  private armRefresh(): void {
    if (this.refreshTimer !== null) {
      return;
    }
    this.refreshTimer = setInterval(() => {
      if (this.keycloak.authenticated) {
        void this.keycloak.updateToken(60).catch(() => {
          this.signedIn.set(false);
        });
        return;
      }
      const session = this.readSession();
      if (!session) {
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      if (session.exp - now > 60) {
        return;
      }
      void this.refresh(session).catch(() => undefined);
    }, 20000);
  }
}

function preferredUsername(token: string): string | null {
  const part = token.split('.')[1];
  if (!part) {
    return null;
  }
  try {
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { preferred_username?: unknown };
    return typeof json.preferred_username === 'string' && json.preferred_username.length > 0
      ? json.preferred_username
      : null;
  } catch {
    return null;
  }
}
