  export interface donation {
    donationId: number;
    donorId: number;
    donorName: string;
    ngoId: number | undefined;
    ngoName: number | undefined;
    itemName: string;
    quantity: number;
    bestBeforeDate: string;
    pickupLocation: string;
    availabilityStart: string;
    availabilityEnd: string;
    status: string;
    photoUrl: string;
    createdAt: string;
    updatedAt: string;
    latitude: string;
    longitude: string;
    quantityUnit: string;
    quantityUnitLabel: string;
  }
