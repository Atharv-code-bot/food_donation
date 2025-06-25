import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserService {
  private baseUrl = 'http://localhost:8080/users';

  constructor(private http: HttpClient) {}

  getCurrentUser() {
    return this.http.get<any>(`${this.baseUrl}/current`);
  }

  updateUserProfile(updatedData: any) {
    const formData = new FormData();
    formData.append('userRequest', JSON.stringify(updatedData));

    return this.http.put(`${this.baseUrl}/update`, formData);
  }

  updateUserAvatar(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.put(`${this.baseUrl}/update`, formData);
  }

  getUserImage(photoUrl: string) {
    return this.http.get(`http://localhost:8080${photoUrl}`, {
      responseType: 'blob',
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put(`${this.baseUrl}/password-change`, {
      currentPassword,
      newPassword,
    });
  }
}
