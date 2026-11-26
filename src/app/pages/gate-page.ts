import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { problemFrom } from '../core/problem';

@Component({
  selector: 'app-gate',
  imports: [RouterLink],
  templateUrl: './gate-page.html',
})
export class GatePage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly mode = toSignal(
    this.route.data.pipe(map((data) => (data['mode'] === 'signup' ? 'signup' : 'login'))),
    { initialValue: 'login' as 'login' | 'signup' },
  );

  protected readonly loginUsername = signal('');
  protected readonly loginPassword = signal('');
  protected readonly signupUsername = signal('');
  protected readonly signupFirstName = signal('');
  protected readonly signupLastName = signal('');
  protected readonly signupEmail = signal('');
  protected readonly signupPassword = signal('');
  protected readonly submittingLogin = signal(false);
  protected readonly submittingSignup = signal(false);
  protected readonly loginFailed = signal(false);
  protected readonly signupProblem = signal<'email' | 'other' | null>(null);

  constructor() {
    void this.auth.init().then(() => {
      if (this.auth.signedIn()) {
        void this.router.navigateByUrl('/');
      }
    });
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async submitLogin(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submittingLogin()) {
      return;
    }
    this.submittingLogin.set(true);
    this.loginFailed.set(false);
    try {
      await this.auth.login(this.loginUsername(), this.loginPassword());
      await this.router.navigateByUrl('/');
    } catch {
      this.loginFailed.set(true);
    } finally {
      this.submittingLogin.set(false);
    }
  }

  protected async submitSignup(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submittingSignup()) {
      return;
    }
    this.submittingSignup.set(true);
    this.signupProblem.set(null);
    const username = this.signupUsername();
    const email = this.signupEmail();
    const firstName = this.signupFirstName();
    const lastName = this.signupLastName();
    const password = this.signupPassword();
    try {
      await this.auth.register(username, email, firstName, lastName, password);
      await this.auth.login(username, password);
      await this.router.navigateByUrl('/');
    } catch (error) {
      const type = problemFrom(error).type;
      this.signupProblem.set(type.endsWith('/email-already-registered') ? 'email' : 'other');
    } finally {
      this.submittingSignup.set(false);
    }
  }
}
