export interface DonationRequestPayload {
  itemName: string;
  quantity: number;
  quantityUnit: string; // ✅ Added this
  bestBeforeDate: string;
  pickupLocation: string;
  availabilityStart: string;
  availabilityEnd: string;
  latitude: string;
  longitude: string;
}
