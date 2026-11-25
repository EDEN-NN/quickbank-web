import { Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../environments/environment';

const SIGN_IN_REQUIRED = 'Sign in required';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = new Keycloak({
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId,
  });
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

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
  // before painting, so / stayed white. Sign-in is a top-level redirect.
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
      this.applySession(authenticated);
    } catch {
      this.signedIn.set(false);
      this.username.set(null);
      this.initError.set(
        'Keycloak did not answer at ' +
          environment.keycloak.url +
          '. Start the Compose stack and reload this page.',
      );
    }
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
    void this.keycloak.logout({ redirectUri: `${window.location.origin}/` });
  }

  async ensureToken(): Promise<string> {
    if (!this.keycloak.authenticated) {
      throw new Error(SIGN_IN_REQUIRED);
    }
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

  private applySession(authenticated: boolean): void {
    this.signedIn.set(authenticated);
    if (!authenticated) {
      this.username.set(null);
      return;
    }
    const parsed = this.keycloak.tokenParsed;
    const name = parsed ? parsed['preferred_username'] : null;
    this.username.set(typeof name === 'string' && name.length > 0 ? name : null);
    if (this.refreshTimer === null) {
      this.refreshTimer = setInterval(() => {
        void this.keycloak.updateToken(60).catch(() => {
          this.signedIn.set(false);
        });
      }, 20000);
    }
  }
}
