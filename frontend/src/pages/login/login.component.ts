import {
  Component,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslationService, Lang } from '../../services/translation.service';
import { AppSettingsService } from '../../services/app-settings.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { markDirty } from '../../utils/mark-dirty';

@Component({
  selector: 'app-login',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-lang-toggle">
          <button [class.active]="ts.lang === 'en'" (click)="ts.setLang('en')">
            EN
          </button>
          <button [class.active]="ts.lang === 'es'" (click)="ts.setLang('es')">
            ES
          </button>
        </div>
        <div class="login-header">
          <img [src]="logo" [attr.alt]="appName" class="login-logo" />
          <h1>{{ appName }}</h1>
          <p>{{ 'login.title' | translate }}</p>
        </div>
        <form (ngSubmit)="onLogin()" #loginForm="ngForm">
          <div class="form-group">
            <label for="username">{{ 'login.username' | translate }}</label>
            <input
              id="username"
              [(ngModel)]="username"
              name="username"
              [placeholder]="'login.username.placeholder' | translate"
              required
              autofocus
            />
          </div>
          <div class="form-group">
            <label for="password">{{ 'login.password' | translate }}</label>
            <input
              id="password"
              [(ngModel)]="password"
              name="password"
              type="password"
              [placeholder]="'login.password.placeholder' | translate"
              required
            />
          </div>
          @if (errorMessage) {
            <div class="login-error">{{ errorMessage }}</div>
          }
          <button type="submit" [disabled]="!loginForm.valid || loading">
            {{
              loading
                ? ('login.submitting' | translate)
                : ('login.submit' | translate)
            }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('loginForm') loginForm!: NgForm;
  appName = 'MechanicApp';
  logo = '/assets/JOES.svg';
  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public ts: TranslationService,
    private appSettings: AppSettingsService,
    private toast: ToastService,
  ) {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.appSettings
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe((s) => {
        this.appName = s.appName;
        this.logo = s.logoUrl || '/assets/JOES.svg';
      });
  }

  onLogin(): void {
    if (this.loginForm?.invalid) {
      this.toast.error(this.ts.t('common.fieldsRequired'));
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    this.authService
      .login(this.username, this.password)
      .pipe(takeUntilDestroyed(this.destroyRef), markDirty(this.cdr))
      .subscribe({
        next: (success) => {
          this.loading = false;
          if (success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage = this.ts.t('login.error');
          }
        },
        error: () => {
          this.loading = false;
          this.errorMessage = this.ts.t('login.serverError');
        },
      });
  }
}
