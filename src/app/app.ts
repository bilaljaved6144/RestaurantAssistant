import { Component, signal } from '@angular/core';
import { Chat }              from './components/chat/chat';
import { ImageAnalysis }     from './components/image-analysis/image-analysis';
import { ReviewAnalysis }    from './components/review-analysis/review-analysis';
import { VoiceOrdering }     from './components/voice-ordering/voice-ordering';
import { ConciergeJourney }  from './components/concierge-journey/concierge-journey';

type Tab = 'journey' | 'chat' | 'vision' | 'review' | 'voice';

@Component({
  selector: 'app-root',
  imports: [ConciergeJourney, Chat, ImageAnalysis, ReviewAnalysis, VoiceOrdering],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  activeTab = signal<Tab>('journey');
  setTab(tab: Tab) { this.activeTab.set(tab); }
}
