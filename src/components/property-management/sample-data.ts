import { Tenant, Unit, RentCall, Lead } from "./types";

export const sampleTenants: Tenant[] = [
  { id: 1, name: "Thabo Nkosi", unit: "A203", building: "Sandton Gardens", phone: "082 444 1234", lease: "2024-03-01", leaseEnd: "2025-02-28", rent: 9500, status: "current" },
  { id: 2, name: "Priya Pillay", unit: "B104", building: "Sandton Gardens", phone: "071 222 5678", lease: "2023-11-01", leaseEnd: "2024-10-31", rent: 8200, status: "overdue" },
  { id: 3, name: "James van der Berg", unit: "C301", building: "Rosebank Mews", phone: "063 111 9012", lease: "2024-01-15", leaseEnd: "2025-01-14", rent: 12000, status: "current" },
  { id: 4, name: "Fatima Moosa", unit: "A101", building: "Rosebank Mews", phone: "084 333 3456", lease: "2023-08-01", leaseEnd: "2024-07-31", rent: 7800, status: "overdue" },
];

export const sampleUnits: Unit[] = [
  { id: 1, building: "Sandton Gardens", unit: "D205", type: "2 Bed", floor: 2, rent: 10500, available: "2024-04-01", features: ["Balcony", "Parking", "Pet Friendly"], status: "available" },
  { id: 2, building: "Sandton Gardens", unit: "B302", type: "1 Bed", floor: 3, rent: 7200, available: "Now", features: ["City View", "Parking"], status: "available" },
  { id: 3, building: "Rosebank Mews", unit: "A405", type: "3 Bed", floor: 4, rent: 16500, available: "2024-05-01", features: ["Garden", "2x Parking", "Pet Friendly"], status: "available" },
];

export const sampleRentCalls: RentCall[] = [
  { id: 1, name: "Priya Pillay", unit: "B104", phone: "071 222 5678", amount: 8200, overdue: 32, status: "pending" },
  { id: 2, name: "Fatima Moosa", unit: "A101", phone: "084 333 3456", amount: 7800, overdue: 18, status: "pending" },
  { id: 3, name: "Sipho Dlamini", unit: "C202", phone: "076 555 7890", amount: 9100, overdue: 45, status: "called" },
];

export const sampleLeads: Lead[] = [
  { id: 1, name: "Karen Smith", phone: "083 999 1111", interest: "2 Bed", budget: "R9,000-R11,000", moveIn: "2024-04-01", income: "Verified", captured: "10 min ago", score: "hot" },
  { id: 2, name: "Ahmed Joosub", phone: "072 888 2222", interest: "1 Bed", budget: "R7,000-R8,000", moveIn: "Now", income: "Pending", captured: "2 hrs ago", score: "warm" },
];
