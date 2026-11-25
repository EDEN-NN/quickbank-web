import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Drawer } from './shell/drawer';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, Drawer],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly drawerOpen = signal(false);

  constructor() {
    void this.auth.init();
  }
}
