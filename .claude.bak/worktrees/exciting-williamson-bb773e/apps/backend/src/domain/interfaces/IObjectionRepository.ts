import { Objection, CreateObjectionInput, ObjectionWithTestOwner } from '../entities/Objection';

export interface IObjectionRepository {
  create(input: CreateObjectionInput): Promise<Objection>;
  findByAttemptAndQuestion(attemptId: string, questionId: string): Promise<Objection | null>;
  findByIdWithTestOwner(objectionId: string): Promise<ObjectionWithTestOwner | null>;
  updateAnswer(objectionId: string, data: { answerText: string; answeredAt: Date; status: 'ANSWERED' }): Promise<Objection | null>;
  escalate(objectionId: string, data: { status: 'ESCALATED'; escalatedAt: Date }): Promise<Objection | null>;
  listEscalated(filters?: { from?: Date; to?: Date }): Promise<Objection[]>;
  countByTestAndCandidate(testId: string, candidateId: string): Promise<number>;
  findOverdueOpenObjections(olderThanDays: number, limit?: number): Promise<Objection[]>;
  markEscalated(objectionIds: string[]): Promise<number>;
}
