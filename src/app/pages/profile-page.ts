import { Component, inject, signal } from '@angular/core';
import { QuickBankApi } from '../core/api.service';
import { problemFrom } from '../core/problem';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly api = inject(QuickBankApi);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly notice = signal<string | null>(null);
  protected readonly problem = signal<'email' | 'other' | null>(null);
  protected readonly loadError = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.problem.set(null);
    this.notice.set(null);
    try {
      const updated = await this.api.updateProfile(this.email(), this.firstName(), this.lastName());
      this.email.set(updated.email);
      this.firstName.set(updated.firstName);
      this.lastName.set(updated.lastName);
      this.notice.set('Perfil atualizado.');
    } catch (error) {
      const type = problemFrom(error).type;
      this.problem.set(type.endsWith('/email-already-registered') ? 'email' : 'other');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const profile = await this.api.profile();
      this.username.set(profile.username);
      this.email.set(profile.email);
      this.firstName.set(profile.firstName);
      this.lastName.set(profile.lastName);
    } catch {
      this.loadError.set('Não foi possível carregar o perfil.');
    } finally {
      this.loading.set(false);
    }
  }
}
