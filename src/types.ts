export enum TrainingStatus {
  VALID = 'VALID',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
}

export interface Training {
  id: string;
  name: string;
  description: string;
  validityMonths: number;
  category: string;
  type: 'Theoretical' | 'Practical' | 'Digital' | 'Certification';
}

export interface Employee {
  id: string;
  name: string;
  csId: string;
  unit: string;
  role: string;
  photoUrl?: string;
  rating?: number;
}

export interface EmployeeTraining {
  id: string;
  employeeId: string;
  trainingId: string;
  completionDate: string;
  expiryDate: string;
  status: TrainingStatus;
}
