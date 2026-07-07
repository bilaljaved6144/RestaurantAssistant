import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5041/api';

  constructor(private http: HttpClient) {}

  chat(message: string, history: { role: string; content: string }[] = [], sessionId?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat`, { message, history, sessionId });
  }

  analyzeImage(file: File): Observable<any> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post(`${this.baseUrl}/vision/analyze`, form);
  }

  analyzeReview(text: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/language/analyze`, { text });
  }

  transcribeSpeech(audio: Blob): Observable<any> {
    const form = new FormData();
    form.append('audio', audio, 'recording.wav');
    return this.http.post(`${this.baseUrl}/speech/transcribe`, form);
  }

  synthesizeSpeech(text: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/speech/synthesize`, { text }, { responseType: 'blob' });
  }

  // ===== Concierge Journey endpoints =====

  extractMenu(file: File, sessionId: string): Observable<any> {
    const form = new FormData();
    form.append('image', file);
    form.append('sessionId', sessionId);
    return this.http.post(`${this.baseUrl}/menu/extract`, form);
  }

  parseOrder(text: string, sessionId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/order/parse`, { text, sessionId });
  }

  respondToReview(text: string, sessionId?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/review/respond`, { text, sessionId });
  }
}
