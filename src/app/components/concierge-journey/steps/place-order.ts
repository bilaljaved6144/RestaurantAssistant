import { Component, signal, output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { SessionService, OrderSummary } from '../../../services/session.service';

type Phase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'speaking'
  | 'confirmed';

@Component({
  selector: 'app-place-order-step',
  imports: [CommonModule],
  templateUrl: './place-order.html',
  styleUrls: ['./_step-shared.css', './place-order.css']
})
export class PlaceOrderStep implements OnDestroy {
  completed = output<void>();

  phase           = signal<Phase>('idle');
  statusMessage   = signal('Tap the microphone and speak your order.');
  transcribedText = signal('');
  errorMsg        = signal<string | null>(null);
  showMenu        = signal(false);

  private readonly SAMPLE_RATE = 16000;
  private mediaStream:   MediaStream | null = null;
  private audioContext:  AudioContext | null = null;
  private sourceNode:    MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private pcmChunks:     Float32Array[] = [];
  private currentAudio:  HTMLAudioElement | null = null;

  constructor(private api: ApiService, public session: SessionService) {}

  get order(): OrderSummary | null { return this.session.order(); }
  get isBusy(): boolean {
    const p = this.phase();
    return p === 'transcribing' || p === 'parsing' || p === 'speaking';
  }

  async toggleRecording() {
    if (this.phase() === 'recording') { this.stopRecording(); return; }
    if (this.isBusy) return;
    await this.startRecording();
  }

  private async startRecording() {
    this.errorMsg.set(null);
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.SAMPLE_RATE, channelCount: 1, echoCancellation: true }
      });
      this.audioContext  = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      this.sourceNode    = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.pcmChunks     = [];

      this.processorNode.onaudioprocess = (e) => {
        this.pcmChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.phase.set('recording');
      this.transcribedText.set('');
      this.session.setOrder(null);
      this.statusMessage.set('🔴 Recording... tap to stop.');
    } catch {
      this.errorMsg.set('Microphone access denied. Please allow microphone permissions.');
    }
  }

  private stopRecording() {
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.audioContext?.close();
    this.mediaStream?.getTracks().forEach(t => t.stop());

    this.phase.set('transcribing');
    this.statusMessage.set('Transcribing your order (Speech)...');

    const wav = this.encodeWav(this.pcmChunks, this.SAMPLE_RATE);
    this.api.transcribeSpeech(wav).subscribe({
      next: (res) => {
        if (res.error || !res.text?.trim()) {
          this.errorMsg.set(res.error ?? 'No speech detected. Please try again.');
          this.phase.set('idle');
          this.statusMessage.set('Tap the microphone to try again.');
          return;
        }
        this.transcribedText.set(res.text);
        this.parseOrder(res.text);
      },
      error: () => {
        this.errorMsg.set('Transcription failed. Please try again.');
        this.phase.set('idle');
      }
    });
  }

  private parseOrder(text: string) {
    this.phase.set('parsing');
    this.statusMessage.set('Matching items against the menu (OpenAI)...');

    this.api.parseOrder(text, this.session.sessionId()).subscribe({
      next: (res) => {
        if (res.error) {
          this.errorMsg.set(res.error);
          this.phase.set('idle');
          return;
        }
        const summary: OrderSummary = {
          items:            res.items ?? [],
          total:            res.total ?? 0,
          confirmationText: res.confirmationText ?? '',
          unmatchedItems:   res.unmatchedItems ?? []
        };
        this.session.setOrder(summary);
        this.speakConfirmation(summary.confirmationText);
      },
      error: () => {
        this.errorMsg.set('Order parsing failed. Please try again.');
        this.phase.set('idle');
      }
    });
  }

  private speakConfirmation(text: string) {
    if (!text) { this.phase.set('confirmed'); return; }
    this.phase.set('speaking');
    this.statusMessage.set('Reading confirmation aloud (Speech TTS)...');

    this.api.synthesizeSpeech(text).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.currentAudio = new Audio(url);
        this.currentAudio.play().catch(() => {});
        this.phase.set('confirmed');
        this.statusMessage.set('✅ Order confirmed. Tap the mic to redo, or continue.');
      },
      error: () => {
        this.phase.set('confirmed');
        this.statusMessage.set('✅ Order confirmed (audio unavailable).');
      }
    });
  }

  replayConfirmation() { this.currentAudio?.play().catch(() => {}); }

  proceed() { this.completed.emit(); }

  private encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
    const totalLen = chunks.reduce((a, c) => a + c.length, 0);
    const pcm      = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) { pcm.set(c, offset); offset += c.length; }

    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const buf = new ArrayBuffer(44 + int16.byteLength);
    const v   = new DataView(buf);
    const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));

    str(0,'RIFF'); v.setUint32(4, 36 + int16.byteLength, true);
    str(8,'WAVE'); str(12,'fmt ');
    v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
    v.setUint32(24,sampleRate,true); v.setUint32(28,sampleRate*2,true);
    v.setUint16(32,2,true); v.setUint16(34,16,true);
    str(36,'data'); v.setUint32(40,int16.byteLength,true);
    new Uint8Array(buf,44).set(new Uint8Array(int16.buffer));
    return new Blob([buf], { type: 'audio/wav' });
  }

  ngOnDestroy() {
    this.mediaStream?.getTracks().forEach(t => t.stop());
    this.audioContext?.close();
  }
}
