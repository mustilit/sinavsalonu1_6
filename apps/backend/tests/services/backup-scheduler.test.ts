import { isValidCronExpression } from '../../src/nest/services/BackupSchedulerService';

describe('BackupSchedulerService.isValidCronExpression', () => {
  describe('geçerli cron ifadeleri', () => {
    it.each([
      ['her gün 03:00', '0 3 * * *'],
      ['her dakika', '* * * * *'],
      ['saat başı', '0 * * * *'],
      ['hafta içi 09:00', '0 9 * * 1-5'],
      ['her 5 dakika', '*/5 * * * *'],
      ['ayın 1\'inde 00:30', '30 0 1 * *'],
      ['her pazar 22:00', '0 22 * * 0'],
      ['ikinci her 6 saatte', '0 */6 * * *'],
    ])('%s — %s', (_label, expr) => {
      expect(isValidCronExpression(expr)).toBe(true);
    });
  });

  describe('geçersiz cron ifadeleri', () => {
    it.each([
      ['boş string', ''],
      ['boşluk', '   '],
      ['eksik alan (4)', '0 3 * *'],
      ['fazla alan (6)', '0 3 * * * *'],
      ['hatalı saat (24)', '0 24 * * *'],
      ['hatalı dakika (60)', '60 * * * *'],
      ['hatalı haftaGünü (8)', '0 0 * * 8'],
      ['hatalı ay (13)', '0 0 1 13 *'],
      ['random metin', 'abc def'],
    ])('%s — %s', (_label, expr) => {
      expect(isValidCronExpression(expr)).toBe(false);
    });

    it('null/undefined → false', () => {
      expect(isValidCronExpression(null as any)).toBe(false);
      expect(isValidCronExpression(undefined as any)).toBe(false);
    });

    it('non-string tip → false', () => {
      expect(isValidCronExpression(123 as any)).toBe(false);
      expect(isValidCronExpression({} as any)).toBe(false);
    });
  });
});
