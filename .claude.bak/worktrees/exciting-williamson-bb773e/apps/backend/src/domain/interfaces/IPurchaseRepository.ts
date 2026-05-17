export interface PurchaseRecord {
  id: string;
  testId: string;
  candidateId: string;
  createdAt: Date;
}

export interface PurchaseWithAttemptRecord extends PurchaseRecord {
  amountCents: number | null;
  test: { id: string; title: string; status: string; examTypeId: string | null };
  attempt: { id: string; status: string; startedAt: Date; completedAt: Date | null } | null;
}

export interface IPurchaseRepository {
  hasPurchase(testId: string, candidateId: string): Promise<boolean>;
  findById(purchaseId: string): Promise<PurchaseRecord | null>;
  findByCandidateId(candidateId: string): Promise<PurchaseWithAttemptRecord[]>;
}

