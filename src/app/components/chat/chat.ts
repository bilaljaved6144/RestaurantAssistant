import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {
  messages = signal<Message[]>([]);
  inputText = '';
  isLoading = signal(false);

  readonly suggestions = [
    'Recommend a spicy burger',
    'Suggest a healthy dinner option',
    'I have diabetes. What should I eat?',
    'Recommend something under $10',
    'What drink goes well with pizza?'
  ];

  constructor(private api: ApiService) {}

  sendSuggestion(text: string) {
    this.inputText = text;
    this.sendMessage();
  }

  sendMessage() {
    const message = this.inputText.trim();
    if (!message || this.isLoading()) return;

    this.messages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.inputText = '';
    this.isLoading.set(true);

    const history = this.messages()
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    this.api.chat(message, history).subscribe({
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
}
