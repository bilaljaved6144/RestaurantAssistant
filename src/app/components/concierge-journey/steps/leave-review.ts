import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';

interface ReviewResult {
  sentiment: string;
  confidenceScores: { positive: number; neutral: number; negative: number };
  keyPhrases: string[];
  managerResponse: string;
  error?: string;
}

@Component({
  selector: 'app-leave-review-step',
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-review.html',
  styleUrls: ['./_step-shared.css', './leave-review.css']
})
export class LeaveReviewStep {
  completed = output<void>();
  restart   = output<void>();

  reviewText = '';
  result     = signal<ReviewResult | null>(null);
  isLoading  = signal(false);

  readonly examples = [
    'Everything was fantastic — the burger was juicy and the staff was so friendly!',
    'The food was okay but we waited 45 minutes and the fries were cold.',
    'Absolutely terrible — my order was wrong and nobody apologised.'
  ];

  constructor(private api: ApiService, public session: SessionService) {}

  useExample(text: string) { this.reviewText = text; this.analyze(); }

  analyze() {
    const text = this.reviewText.trim();
    if (!text || this.isLoading()) return;

    this.isLoading.set(true);
    this.result.set(null);

    this.api.respondToReview(text, this.session.sessionId()).subscribe({
      next: (res: ReviewResult) => { this.result.set(res); this.isLoading.set(false); },
      error: () => {
        this.result.set({
          sentiment: '',
          confidenceScores: { positive: 0, neutral: 0, negative: 0 },
          keyPhrases: [],
          managerResponse: '',
          error: 'Review analysis failed. Please try again.'
        });
        this.isLoading.set(false);
      }
    });
  }

  sentimentClass(): string {
    const s = this.result()?.sentiment?.toLowerCase();
    if (s === 'positive') return 'positive';
    if (s === 'negative') return 'negative';
    if (s === 'mixed')    return 'mixed';
    return 'neutral';
  }

  sentimentEmoji(): string {
    const s = this.result()?.sentiment?.toLowerCase();
    if (s === 'positive') return '😊';
    if (s === 'negative') return '😞';
    if (s === 'mixed')    return '🤔';
    return '😐';
  }

  finish() { this.completed.emit(); }
  startOver() { this.restart.emit(); }
}
