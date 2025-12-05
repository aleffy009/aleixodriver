
export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus; // Novo campo status
  phone?: string;
  cpf?: string; 
  vehicleType?: 'CAR' | 'MOTO' | null;
  vehiclePlate?: string;
  vehicleColor?: string; 
  rating?: number;
  earnings?: number; 
  balance?: number; 
  photoUrl?: string; 
}

export enum RideStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string;
  
  // Origin Data
  origin: string;
  originLat?: number; 
  originLng?: number; 
  
  // Destination Data
  destination: string;
  destLat?: number; // Novo campo
  destLng?: number; // Novo campo

  price: number;
  type: 'CAR' | 'MOTO';
  status: RideStatus;
  timestamp: number;
  distanceFormatted?: string;
  notes?: string; 
  paymentMethod?: 'CASH' | 'PIX';
  
  // AI Data
  aiObservation?: string; 
}

export interface PlaceSuggestion {
  name: string;
  address: string;
  lat?: number; 
  lng?: number; 
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RechargeOption {
  id: string;
  value: number;
  qrCodeUrl: string; 
}

export interface PricingRules {
  moto: {
    basePrice: number;
    pricePerKm: number;
  };
  car: {
    basePrice: number;
    pricePerKm: number;
  };
  platformFee: number; // Porcentagem da taxa administrativa (ex: 15)
}

export interface SystemError {
  id: string;
  errorMessage: string;
  componentStack: string;
  timestamp: number;
  aiAnalysis: {
      userMessage: string;
      technicalDetails: string;
      suggestedFix: string;
      severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  };
}

// --- TOAST TYPES ---
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
