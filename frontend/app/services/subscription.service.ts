import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { SubscriptionStatus, Subscription } from '../models/subscription';

export interface SubscriptionConfig {
  checkoutUrl: string;
  productId: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private apiUrl = '/api/subscription';

  /** Reactive signal for subscription status */
  readonly status = signal<SubscriptionStatus>({
    active: true,
    status: 'unknown',
  });

  constructor(private http: HttpClient) {}

  get isActive(): boolean {
    return this.status().active;
  }

  get current(): SubscriptionStatus {
    return this.status();
  }

  /** Check subscription status from the API */
  checkStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.apiUrl}/status`).pipe(
      tap((s) => this.status.set(s)),
      catchError(() => {
        const inactive: SubscriptionStatus = {
          active: false,
          status: 'error',
        };
        this.status.set(inactive);
        return of(inactive);
      }),
    );
  }

  /** Get Hotmart config (checkout URL, product ID) */
  getConfig(): Observable<SubscriptionConfig> {
    return this.http.get<SubscriptionConfig>(`${this.apiUrl}/config`);
  }

  /** Get detailed subscription history (admin) */
  getDetails(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/details`);
  }

  /** Manually activate subscription (admin/testing) */
  activate(req: {
    email?: string;
    planName?: string;
    expiresAt?: string;
  }): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/activate`, req)
      .pipe(tap(() => this.checkStatus().subscribe()));
  }
}
