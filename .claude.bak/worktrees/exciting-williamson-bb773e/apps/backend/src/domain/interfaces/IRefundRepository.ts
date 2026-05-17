export type RefundRequest = {
  id: string;
  purchaseId: string;
  candidateId: string;
  testId: string;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedBy?: string | null;
  decidedAt?: string | null;
  createdAt: string;
};

/** Refund list item with optional test title for UX (include purchase.test.title) */
export type RefundListItem = RefundRequest & { testTitle?: string | null };

export interface IRefundRepository {
  create(input: { purchaseId: string; candidateId: string; testId: string; reason?: string }): Promise<RefundRequest>;
  findByPurchaseId(purchaseId: string): Promise<RefundRequest | null>;
  findById(id: string): Promise<RefundRequest | null>;
  findByCandidateId(candidateId: string): Promise<RefundListItem[]>;
  findByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<RefundListItem[]>;
  updateStatus(id: string, status: 'APPROVED' | 'REJECTED', decidedBy: string): Promise<RefundRequest>;
  approve(refundId: string, adminId: string, decidedAt: Date): Promise<RefundRequest>;
  reject(refundId: string, adminId: string, decidedAt: Date, reason?: string): Promise<RefundRequest>;
}

