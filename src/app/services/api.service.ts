import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:5041/api';

  constructor(private http: HttpClient) {}

  chat(message: string, history: { role: string; content: string }[] = []): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat`, { message, history });
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
}
