import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AccountPage } from './pages/account-page';
import { Home } from './pages/home';
import { StatementPage } from './pages/statement-page';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'account', component: AccountPage, canActivate: [authGuard] },
  { path: 'statement', component: StatementPage, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
