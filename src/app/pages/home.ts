import { afterEveryRender, Component, ElementRef, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;
  private armed = false;

  constructor() {
    afterEveryRender(() => {
      if (this.armed) {
        return;
      }
      const bands = Array.from(this.host.nativeElement.querySelectorAll('.band')) as HTMLElement[];
      if (!bands.length) {
        return;
      }
      this.armed = true;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !('IntersectionObserver' in window)) {
        bands.forEach((band) => band.classList.add('is-in'));
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            entry.target.classList.add('is-in');
            this.observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
      );
      bands.forEach((band) => this.observer?.observe(band));
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
