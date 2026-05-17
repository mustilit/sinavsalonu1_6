import type { IContractRepository } from '../../domain/interfaces/IContractRepository';
import type { ContractType } from '../../domain/types';

export class ListContractsUseCase {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(type?: ContractType) {
    return this.contractRepo.list(type);
  }
}
