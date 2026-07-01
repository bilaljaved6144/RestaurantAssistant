import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-voice-ordering',
  imports: [CommonModule],
  templateUrl: './voice-ordering.html',
  styleUrl: './voice-ordering.css'
})
export class VoiceOrdering implements OnDestroy {
  isRecording    = signal(false);
  isProcessing   = signal(false);
  statusMessage  = signal('Click the microphone to start recording your order');
  transcribedText = signal('');
  aiResponse     = signal('');
  audioUrl       = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private currentAudio: HTMLAudioElement | null = null;

  constructor(private api: ApiService) {}

  async toggleRecording() {
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  private async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.transcribedText.set('');
      this.aiResponse.set('');
      this.audioUrl.set(null);

      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => this.processAudio(stream);

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.statusMessage.set('🔴 Recording... Click again to stop');
    } catch {
      this.statusMessage.set('⚠️ Microphone access denied. Please allow microphone permissions.');
    }
  }

  private stopRecording() {
    this.mediaRecorder?.stop();
    this.isRecording.set(false);
    this.statusMessage.set('Processing your speech...');
  }

  private processAudio(stream: MediaStream) {
    stream.getTracks().forEach(t => t.stop());
    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const blob = new Blob(this.audioChunks, { type: mimeType });

    this.isProcessing.set(true);
    this.api.transcribeSpeech(blob).subscribe({
      next: (res) => {
        if (res.error) {
          this.statusMessage.set('❌ Transcription failed: ' + res.error);
          this.isProcessing.set(false);
          return;
        }
        this.transcribedText.set(res.text);
        this.statusMessage.set('Getting AI response...');
        this.getAIResponse(res.text);
      },
      error: () => {
        this.statusMessage.set('❌ Transcription failed. Please try again.');
        this.isProcessing.set(false);
      }
    });
  }

  private getAIResponse(text: string) {
    this.api.chat(text).subscribe({
      next: (res) => {
        const response = res.response ?? 'Sorry, I could not process your order.';
        this.aiResponse.set(response);
        this.statusMessage.set('Generating voice response...');
        this.speakResponse(response);
      },
      error: () => {
        this.aiResponse.set('Sorry, something went wrong processing your order.');
        this.isProcessing.set(false);
        this.statusMessage.set('Click the microphone to try again.');
      }
    });
  }

  private speakResponse(text: string) {
    this.api.synthesizeSpeech(text).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.audioUrl.set(url);
        this.currentAudio = new Audio(url);
        this.currentAudio.play();
        this.isProcessing.set(false);
        this.statusMessage.set('✅ Order received! Click the microphone to place another order.');
      },
      error: () => {
        this.isProcessing.set(false);
        this.statusMessage.set('✅ Response ready. (TTS unavailable) Click microphone to order again.');
      }
    });
  }

  replayAudio() {
    this.currentAudio?.play();
  }

  ngOnDestroy() {
    if (this.audioUrl()) URL.revokeObjectURL(this.audioUrl()!);
  }
}
