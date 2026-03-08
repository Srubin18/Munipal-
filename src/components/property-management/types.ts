export interface Tenant {
  id: number;
  name: string;
  unit: string;
  building: string;
  phone: string;
  lease: string;
  leaseEnd: string;
  rent: number;
  status: "current" | "overdue";
}

export interface Unit {
  id: number;
  building: string;
  unit: string;
  type: string;
  floor: number;
  rent: number;
  available: string;
  features: string[];
  status: "available" | "occupied";
}

export interface RentCall {
  id: number;
  name: string;
  unit: string;
  phone: string;
  amount: number;
  overdue: number;
  status: "pending" | "called";
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  interest: string;
  budget: string;
  moveIn: string;
  income: string;
  captured: string;
  score: "hot" | "warm" | "cold";
}
