// src/app/validators/date.validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function bestBeforeDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Get the three controls from the form group
    const bestBefore = control.get('bestBeforeDate');
    const start = control.get('availabilityStart');
    const end = control.get('availabilityEnd');

    // Don't validate if controls are missing or 'best before' isn't set
    if (!bestBefore || !start || !end || !bestBefore.value) {
      return null;
    }

    // Create a Date object for the very end of the "best before" day
    // This is the latest allowed time
    const maxDate = new Date(bestBefore.value + 'T23:59:59');

    // --- Validate Start Date ---
    if (start.value) {
      const startDate = new Date(start.value);
      const errors = start.errors || {};

      if (startDate > maxDate) {
        // Add our custom error
        errors['maxDateError'] = true;
      } else {
        // Remove our custom error if it exists
        delete errors['maxDateError'];
      }

      // Set the errors, or null if no errors are left
      start.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }

    // --- Validate End Date ---
    if (end.value) {
      const endDate = new Date(end.value);
      const errors = end.errors || {};

      if (endDate > maxDate) {
        errors['maxDateError'] = true;
      } else {
        delete errors['maxDateError'];
      }

      end.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }

    // The group validator itself doesn't return an error,
    // but it has successfully updated the child controls.
    return null;
  };
}