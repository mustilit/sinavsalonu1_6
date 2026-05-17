import type { AdminSettings } from '../../domain/types';

/** FR-Y-06: Admin ayarlarını okuma */
export class GetAdminSettingsUseCase {
  async execute(prisma: { adminSettings: { findUnique: (args: any) => Promise<any> } }): Promise<AdminSettings> {
    const row = await prisma.adminSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      return { commissionPercent: 20, vatPercent: 18, purchasesEnabled: true };
    }
    return {
      commissionPercent: row.commissionPercent ?? 20,
      vatPercent: row.vatPercent ?? 18,
      purchasesEnabled: row.purchasesEnabled ?? true,
    };
  }
}
