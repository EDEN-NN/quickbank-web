import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-drawer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './drawer.html',
})
export class Drawer {
  readonly open = input(false);
  readonly navigated = output<void>();

  protected close(): void {
    this.navigated.emit();
  }
}
