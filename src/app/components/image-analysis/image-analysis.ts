import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-image-analysis',
  imports: [CommonModule],
  templateUrl: './image-analysis.html',
  styleUrl: './image-analysis.css'
})
export class ImageAnalysis {
  selectedFile = signal<File | null>(null);
  previewUrl   = signal<string | null>(null);
  result       = signal<any | null>(null);
  isLoading    = signal(false);

  constructor(private api: ApiService) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);
      this.result.set(null);
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  analyze() {
    const file = this.selectedFile();
    if (!file) return;
    this.isLoading.set(true);
    this.api.analyzeImage(file).subscribe({
      next: (res) => { this.result.set(res); this.isLoading.set(false); },
      error: () => {
        this.result.set({ error: 'Image analysis failed. Please try again.' });
        this.isLoading.set(false);
      }
    });
  }
}
