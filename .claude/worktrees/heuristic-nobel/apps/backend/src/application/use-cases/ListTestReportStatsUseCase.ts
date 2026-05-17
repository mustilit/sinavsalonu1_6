import { IObjectionRepository, TestReportStat } from '../../domain/interfaces/IObjectionRepository';

export class ListTestReportStatsUseCase {
  constructor(private readonly objectionRepo: IObjectionRepository) {}

  async execute(): Promise<TestReportStat[]> {
    return this.objectionRepo.listTestReportStats();
  }
}
