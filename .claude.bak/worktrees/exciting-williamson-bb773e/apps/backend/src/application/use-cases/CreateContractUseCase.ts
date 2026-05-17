import type { IContractRepository } from '../../domain/interfaces/IContractRepository';
import { AppError } from '../errors/AppError';

export class CreateContractUseCase {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(input: { type: string; version: number; title: string; content: string; isActive?: boolean }) {
    if (!input.title?.trim()) throw new AppError('INVALID_INPUT', 'Title required', 400);
    if (!input.content?.trim()) throw new AppError('INVALID_INPUT', 'Content required', 400);
    if (input.type !== 'CANDIDATE' && input.type !== 'EDUCATOR') throw new AppError('INVALID_INPUT', 'Type must be CANDIDATE or EDUCATOR', 400);
    if (typeof input.version !== 'number' || input.version < 1) throw new AppError('INVALID_INPUT', 'Version must be >= 1', 400);

    const list = await this.contractRepo.list(input.type as 'CANDIDATE' | 'EDUCATOR');
    const versionExists = list.some((c) => c.version === input.version);
    if (versionExists) throw new AppError('VERSION_EXISTS', `Contract version ${input.version} already exists for type ${input.type}`, 409);

    return this.contractRepo.create({
      type: input.type as 'CANDIDATE' | 'EDUCATOR',
      version: input.version,
      title: input.title.trim(),
      content: input.content.trim(),
      isActive: input.isActive ?? false,
    });
  }
}
