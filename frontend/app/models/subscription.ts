export interface SubscriptionStatus {
  active: boolean;
  status: string;
  planName?: string;
  expiresAt?: string;
  email?: string;
}

export interface Subscription {
  id?: number;
  email: string;
  hotmartTransactionId?: string;
  hotmartSubscriptionId?: string;
  status: string;
  planName?: string;
  startDate?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
