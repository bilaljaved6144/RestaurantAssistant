import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-review-analysis',
  imports: [CommonModule, FormsModule],
  templateUrl: './review-analysis.html',
  styleUrl: './review-analysis.css'
})
export class ReviewAnalysis {
  reviewText = '';
  result     = signal<any | null>(null);
  isLoading  = signal(false);

  readonly examples = [
    'The burger was amazing, but the fries were cold and disappointing.',
    'Best pizza I have ever had! The crust was perfect and the service was outstanding.',
    'I waited one hour for my order and it arrived cold. Very frustrating experience.'
  ];

  constructor(private api: ApiService) {}

  useExample(text: string) {
    this.reviewText = text;
    this.analyze();
  }

  analyze() {
    const text = this.reviewText.trim();
    if (!text) return;
    this.isLoading.set(true);
    this.result.set(null);
    this.api.analyzeReview(text).subscribe({
      next: (res) => { this.result.set(res); this.isLoading.set(false); },
      error: () => {
        this.result.set({ error: 'Analysis failed. Please try again.' });
        this.isLoading.set(false);
      }
    });
  }

  getSentimentClass(): string {
    const s = this.result()?.sentiment?.toLowerCase();
    if (s === 'positive') return 'positive';
    if (s === 'negative') return 'negative';
    return 'neutral';
  }

  getSentimentEmoji(): string {
    const s = this.result()?.sentiment?.toLowerCase();
    if (s === 'positive') return '😊';
    if (s === 'negative') return '😞';
    return '😐';
  }
}
