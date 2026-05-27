import type {
  CustomerHistory,
  OrderRecord,
  PaymentRecord,
  ShipmentRecord,
} from "./types";

export const DEMO_TRANSCRIPT =
  "Hi, I ordered a dining chair and it arrived yesterday with a cracked leg. I also see two charges on my card for the same amount. I need this fixed today.";

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

function hoursAgoISO(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

export const ORDERS: Record<string, OrderRecord> = {
  "WF-20491": {
    orderId: "WF-20491",
    customerId: "CUST-101",
    customerName: "Maya Chen",
    customerTier: "Premium",
    product: "Solid Oak Dining Chair",
    sku: "CHAIR-OAK-112",
    price: 249.99,
    deliveryDate: yesterdayISO(),
    deliveryStatus: "Delivered",
    warrantyWindowDays: 365,
    returnWindowDays: 30,
    damagePolicyEligible: true,
  },
};

export const PAYMENTS: Record<string, PaymentRecord> = {
  "WF-20491": {
    orderId: "WF-20491",
    transactions: [
      {
        id: "txn_001",
        amount: 249.99,
        status: "captured",
        capturedAt: hoursAgoISO(54),
      },
      {
        id: "txn_002",
        amount: 249.99,
        status: "captured",
        capturedAt: hoursAgoISO(53),
      },
    ],
    duplicateChargeDetected: true,
  },
};

export const SHIPMENTS: Record<string, ShipmentRecord> = {
  "WF-20491": {
    orderId: "WF-20491",
    carrier: "MockShip Express",
    status: "Delivered",
    deliveredAt: yesterdayISO(),
    proof: "Delivered to front door, photo confirmation on file.",
  },
};

export const CUSTOMERS: Record<string, CustomerHistory> = {
  "CUST-101": {
    customerId: "CUST-101",
    priorTickets: 2,
    priorIssue: "Asked for update on damaged delivery",
    sentiment: "frustrated",
    loyaltyRisk: "high",
  },
};

export const POLICY_DOCS: string[] = [
  "Damaged items reported within 30 days of delivery are eligible for replacement or refund.",
  "Duplicate captured payments should be refunded immediately after verification.",
  "Structural damage to furniture should be prioritized as replacement over repair.",
  "Premium customers with repeated failed contacts should receive priority handling.",
  "Claims with incomplete evidence should be escalated to human review.",
];

export const DEMO_DAMAGE_NOTE =
  "Demo damage image loaded: cracked oak chair leg, structural fracture visible";
export const DEMO_RECEIPT_NOTE =
  "Demo receipt loaded: order WF-20491 · Maya Chen · Solid Oak Dining Chair · $249.99";
export const DEMO_PAYMENT_NOTE =
  "Demo payment screenshot loaded: two $249.99 captures within 60 seconds of each other";
