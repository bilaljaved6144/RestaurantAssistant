import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { SessionService, MenuItem } from '../../../services/session.service';

@Component({
  selector: 'app-scan-menu-step',
  imports: [CommonModule],
  templateUrl: './scan-menu.html',
  styleUrls: ['./_step-shared.css', './scan-menu.css']
})
export class ScanMenuStep {
  completed = output<void>();

  selectedFile = signal<File | null>(null);
  previewUrl   = signal<string | null>(null);
  isLoading    = signal(false);
  errorMsg     = signal<string | null>(null);
  caption      = signal<string | null>(null);

  constructor(private api: ApiService, public session: SessionService) {}

  get menuItems(): MenuItem[] { return this.session.menuItems(); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.selectedFile.set(file);
    this.errorMsg.set(null);
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  extract() {
    const file = this.selectedFile();
    if (!file) return;

    this.isLoading.set(true);
    this.errorMsg.set(null);

    this.api.extractMenu(file, this.session.sessionId()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.error) {
          this.errorMsg.set(res.error);
          return;
        }
        this.caption.set(res.caption ?? null);
        this.session.setMenu(res.items ?? []);
        if (!res.items?.length) {
          this.errorMsg.set('No menu items could be parsed from that image. Please try a clearer photo.');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMsg.set('Menu extraction failed. Please try again.');
      }
    });
  }

  proceed() { this.completed.emit(); }
}
