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
  isRecording     = signal(false);
  isProcessing    = signal(false);
  statusMessage   = signal('Click the microphone to start recording your order');
  transcribedText = signal('');
  aiResponse      = signal('');
  audioUrl        = signal<string | null>(null);

  private readonly SAMPLE_RATE = 16000;
  private mediaStream:   MediaStream | null = null;
  private audioContext:  AudioContext | null = null;
  private sourceNode:    MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private pcmChunks:     Float32Array[] = [];
  private currentAudio:  HTMLAudioElement | null = null;

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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.SAMPLE_RATE, channelCount: 1, echoCancellation: true }
      });

      this.audioContext  = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      this.sourceNode    = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.pcmChunks     = [];

      // Capture raw PCM Float32 samples from the microphone
      this.processorNode.onaudioprocess = (e) => {
        this.pcmChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording.set(true);
      this.transcribedText.set('');
      this.aiResponse.set('');
      this.audioUrl.set(null);
      this.statusMessage.set('🔴 Recording... Click again to stop');
    } catch {
      this.statusMessage.set('⚠️ Microphone access denied. Please allow microphone permissions.');
    }
  }

  private stopRecording() {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach(t => t.stop());

    this.isRecording.set(false);
    this.isProcessing.set(true);
    this.statusMessage.set('Processing your speech...');

    const wavBlob = this.encodeWav(this.pcmChunks, this.SAMPLE_RATE);
    this.sendAudio(wavBlob);
  }

  /** Encode collected Float32 PCM chunks into a 16-bit mono WAV Blob. */
  private encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
    const totalLen = chunks.reduce((a, c) => a + c.length, 0);
    const pcm      = new Float32Array(totalLen);
    let   offset   = 0;
    for (const c of chunks) { pcm.set(c, offset); offset += c.length; }

    // Float32 → Int16 PCM
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Build RIFF/WAV header (44 bytes)
    const buf = new ArrayBuffer(44 + int16.byteLength);
    const v   = new DataView(buf);
    const str = (o: number, s: string) =>
      [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));

    str(0,  'RIFF'); v.setUint32(4,  36 + int16.byteLength, true);
    str(8,  'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16,          true);  // PCM chunk size
    v.setUint16(20, 1,           true);  // PCM format
    v.setUint16(22, 1,           true);  // mono
    v.setUint32(24, sampleRate,  true);
    v.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
    v.setUint16(32, 2,           true);  // block align
    v.setUint16(34, 16,          true);  // bits per sample
    str(36, 'data'); v.setUint32(40, int16.byteLength, true);
    new Uint8Array(buf, 44).set(new Uint8Array(int16.buffer));

    return new Blob([buf], { type: 'audio/wav' });
  }

  private sendAudio(blob: Blob) {
    this.api.transcribeSpeech(blob).subscribe({
      next: (res) => {
        if (res.error || !res.text?.trim()) {
          this.statusMessage.set('❌ ' + (res.error ?? 'No speech detected. Please speak clearly and try again.'));
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

  replayAudio() { this.currentAudio?.play(); }

  ngOnDestroy() {
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
  }
}

