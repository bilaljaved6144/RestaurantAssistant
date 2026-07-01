import { Component, signal } from '@angular/core';
import { Chat }           from './components/chat/chat';
import { ImageAnalysis }  from './components/image-analysis/image-analysis';
import { ReviewAnalysis } from './components/review-analysis/review-analysis';
import { VoiceOrdering }  from './components/voice-ordering/voice-ordering';

type Tab = 'chat' | 'vision' | 'review' | 'voice';

@Component({
  selector: 'app-root',
  imports: [Chat, ImageAnalysis, ReviewAnalysis, VoiceOrdering],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  activeTab = signal<Tab>('chat');
  setTab(tab: Tab) { this.activeTab.set(tab); }
}
