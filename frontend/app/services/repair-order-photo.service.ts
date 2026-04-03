import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RepairOrderPhoto } from '../models/repair-order-photo';

@Injectable({
  providedIn: 'root',
})
export class RepairOrderPhotoService {
  private apiUrl = '/api/repairorderphoto';

  constructor(private http: HttpClient) {}

  getPhotos(repairOrderId: number): Observable<RepairOrderPhoto[]> {
    return this.http.get<RepairOrderPhoto[]>(`${this.apiUrl}/${repairOrderId}`);
  }

  uploadPhotos(
    repairOrderId: number,
    files: File[],
    description?: string,
  ): Observable<{ message: string; photos: RepairOrderPhoto[] }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (description) formData.append('description', description);
    return this.http.post<{ message: string; photos: RepairOrderPhoto[] }>(
      `${this.apiUrl}/${repairOrderId}`,
      formData,
    );
  }

  deletePhoto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
