import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';

interface Message { role: 'user' | 'assistant'; content: string; }

@Component({
  selector: 'app-get-advice-step',
  imports: [CommonModule, FormsModule],
  templateUrl: './get-advice.html',
  styleUrls: ['./_step-shared.css', './get-advice.css']
})
export class GetAdviceStep {
  completed = output<void>();

  messages   = signal<Message[]>([]);
  inputText  = '';
  isLoading  = signal(false);
  showMenu   = signal(false);

  readonly suggestions = [
    "What do you recommend?",
    "I'm vegetarian, what do you suggest?",
    "What's the cheapest option?",
    "Which item is best value?",
    "I have a nut allergy — what's safe?"
  ];

  constructor(private api: ApiService, public session: SessionService) {}

  sendSuggestion(text: string) { this.inputText = text; this.sendMessage(); }

  sendMessage() {
    const message = this.inputText.trim();
    if (!message || this.isLoading()) return;
    if (!this.session.hasMenu()) return;

    this.messages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.inputText = '';
    this.isLoading.set(true);

    const history = this.messages().slice(-10).map(m => ({ role: m.role, content: m.content }));

    this.api.chat(message, history, this.session.sessionId()).subscribe({
      next: (res) => {
        this.messages.update(msgs => [
          ...msgs,
          { role: 'assistant', content: res.response ?? res.error ?? 'No response.' }
        ]);
        this.isLoading.set(false);
      },
      error: () => {
        this.messages.update(msgs => [
          ...msgs,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
        ]);
        this.isLoading.set(false);
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  proceed() { this.completed.emit(); }
}
