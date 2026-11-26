import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AccountPage } from './pages/account-page';
import { CreditPage } from './pages/credit-page';
import { GatePage } from './pages/gate-page';
import { Home } from './pages/home';
import { ProfilePage } from './pages/profile-page';
import { StatementPage } from './pages/statement-page';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'entrar', component: GatePage, data: { mode: 'login' } },
  { path: 'cadastro', component: GatePage, data: { mode: 'signup' } },
  { path: 'account', component: AccountPage, canActivate: [authGuard] },
  { path: 'statement', component: StatementPage, canActivate: [authGuard] },
  { path: 'credit', component: CreditPage, canActivate: [authGuard] },
  { path: 'profile', component: ProfilePage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
