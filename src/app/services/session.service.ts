import { Injectable, signal, computed } from '@angular/core';

export interface MenuItem {
  name: string;
  price: number | null;
  description?: string | null;
}

export interface OrderLine {
  name: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface OrderSummary {
  items: OrderLine[];
  total: number;
  confirmationText: string;
  unmatchedItems: string[];
}

/**
 * Holds the state that flows across the four steps of the Concierge Journey:
 * a stable sessionId (matched to the backend SessionContext), the menu extracted
 * from the guest's photo, and the confirmed order.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly sessionId = signal<string>(this.generateId());

  readonly menuItems = signal<MenuItem[]>([]);
  readonly hasMenu   = computed(() => this.menuItems().length > 0);

  readonly order = signal<OrderSummary | null>(null);

  setMenu(items: MenuItem[]) {
    this.menuItems.set(items ?? []);
  }

  setOrder(order: OrderSummary | null) {
    this.order.set(order);
  }

  resetJourney() {
    this.sessionId.set(this.generateId());
    this.menuItems.set([]);
    this.order.set(null);
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
