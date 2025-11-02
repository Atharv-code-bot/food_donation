import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from './user.model';
import { environment } from '../../environments/environment'; // This automatically selects the correct file

@Injectable({ providedIn: 'root' })
export class UserService {
  private API_URL = environment.apiUrl + '/users';

  constructor(private http: HttpClient) {}

  getCurrentUser() {
    return this.http.get<any>(`${this.API_URL}/current`);
  }

  updateUserProfile(updatedData: any) {
    const formData = new FormData();
    formData.append('UserRequest', JSON.stringify(updatedData));

    return this.http.put(`${this.API_URL}/update`, formData);
  }

  /**
   * Updates the user's avatar by sending the image file and current user profile data.
   * @param file The new avatar image file.
   * @param currentUser The current user object containing existing profile details.
   * @returns An Observable of the API response.
   */
  updateUserAvatar(file: File, currentUser: User): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);

    const userRequestData = {
      fullname: currentUser.fullname || null,
      phone: currentUser.phone || null,
      address: currentUser.address || null,
      // ✅ FIX: Use 'latitude' and 'longitude' to match UserRequest DTO
      latitude: currentUser.latitude || null, // Change from defaultLatitude
      longitude: currentUser.longitude || null, // Change from defaultLongitude
    };

    formData.append('UserRequest', JSON.stringify(userRequestData));

    formData.forEach((value, key) => {
      console.log(`${key}:`, value);
    });

    return this.http.put(`${this.API_URL}/update`, formData);
  }

  // getUserImage(photoUrl: string) {
  //   return this.http.get(`${this.API_URL}${photoUrl}`, {
  //     responseType: 'blob',
  //   });
  // }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.put(`${this.API_URL}/password-change`, {
      currentPassword,
      newPassword,
    });
  }
}
