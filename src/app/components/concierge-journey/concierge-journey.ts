import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { ScanMenuStep } from './steps/scan-menu';
import { GetAdviceStep } from './steps/get-advice';
import { PlaceOrderStep } from './steps/place-order';
import { LeaveReviewStep } from './steps/leave-review';

type StepId = 1 | 2 | 3 | 4;

interface StepInfo {
  id: StepId;
  icon: string;
  title: string;
  service: string;
}

@Component({
  selector: 'app-concierge-journey',
  imports: [CommonModule, ScanMenuStep, GetAdviceStep, PlaceOrderStep, LeaveReviewStep],
  templateUrl: './concierge-journey.html',
  styleUrl: './concierge-journey.css'
})
export class ConciergeJourney {
  readonly steps: StepInfo[] = [
    { id: 1, icon: '📷', title: 'Scan Menu',        service: 'Azure AI Vision' },
    { id: 2, icon: '💬', title: 'Get Advice',       service: 'Azure OpenAI (menu-grounded)' },
    { id: 3, icon: '🎤', title: 'Place Order',      service: 'Azure Speech + OpenAI' },
    { id: 4, icon: '⭐', title: 'Leave a Review',   service: 'Azure Language + OpenAI' }
  ];

  currentStep = signal<StepId>(1);
  completed   = signal<Set<StepId>>(new Set());

  activeStepInfo = computed(() => this.steps.find(s => s.id === this.currentStep())!);

  constructor(public session: SessionService) {}

  goTo(step: StepId) {
    if (this.completed().has(step) || step <= this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  advance() {
    const cur = this.currentStep();
    this.completed.update(s => new Set(s).add(cur));
    if (cur < 4) this.currentStep.set((cur + 1) as StepId);
  }

  restart() {
    this.session.resetJourney();
    this.completed.set(new Set());
    this.currentStep.set(1);
  }

  stepStatus(id: StepId): 'done' | 'active' | 'pending' {
    if (this.completed().has(id)) return 'done';
    if (this.currentStep() === id) return 'active';
    return 'pending';
  }
}
