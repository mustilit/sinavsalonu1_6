import { IObjectionRepository } from '../../domain/interfaces/IObjectionRepository';
import { Objection } from '../../domain/entities/Objection';

export interface ListEscalatedFilters {
  from?: Date;
  to?: Date;
}

export class ListEscalatedObjectionsUseCase {
  constructor(private readonly objectionRepo: IObjectionRepository) {}

  async execute(filters?: ListEscalatedFilters): Promise<Objection[]> {
    return this.objectionRepo.listEscalated(filters);
  }
}
