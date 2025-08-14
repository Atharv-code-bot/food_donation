import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// ✅ FIX: Use PrimeNG Dialog components
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'; // Keep these imports if you're using MatDialog's service to open the dialog
import { Router } from '@angular/router'; // For redirecting after dialog closes, if needed

@Component({
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    LucideAngularModule,
  ],
  selector: 'app-success-dialog',
  template: `
    <p-dialog 
      header="Success"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      (onHide)="close()"
      styleClass="w-full max-w-md"
    >
      <div class="flex flex-col items-center text-center">
        <div class="bg-green-100 rounded-full p-4 mb-4 flex items-center justify-center">
          <lucide-icon name="check" class="h-10 w-10 text-green-600"></lucide-icon>
        </div>
        <h3 class="text-2xl font-semibold mb-2 text-green-800">
          Success
        </h3>
        <p class="text-gray-600 mb-6">
          {{ data.message }}
        </p>
        <button
          pButton
          label="OK"
          styleClass="p-button-success w-full py-4"
          (click)="close()"
        ></button>
      </div>
    </p-dialog>
  `,
})
export class SuccessDialogComponent {
  visible = true;

  constructor(
    private dialogRef: MatDialogRef<SuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string },
    private router: Router // Inject Router if you want to redirect after closing
  ) {}

  close() {
    this.visible = false;
    this.dialogRef.close();
  }
}