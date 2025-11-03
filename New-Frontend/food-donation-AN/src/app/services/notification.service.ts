// src/app/services/notification.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // This automatically selects the correct file

// Define the structure of a notification as it comes from the API
export interface ApiNotification {
  id: number;
  userId: number;
  message: string;
  topic: string;
  createdAt: number[]; // e.g., [2025, 8, 14, ...]
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private API_URL = environment.apiUrl + '/api/notifications';
  private httpClient = inject(HttpClient);

  getNotifications(): Observable<ApiNotification[]> {
    return this.httpClient.get<ApiNotification[]>(this.API_URL);
  }

  getUnreadCount(): Observable<number> {
    return this.httpClient.get<number>(`${this.API_URL}/unread-count`);
  }

  markAsRead(id: number): Observable<string> { 
    return this.httpClient.put(
      `${this.API_URL}/${id}/mark-read`, 
      null,
      { responseType: 'text' }
    );
  }
}