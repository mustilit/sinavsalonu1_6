/**
 * AdminSiteSettingsController unit testleri.
 */
import { AdminSiteSettingsController } from '../../../src/nest/controllers/admin.site-settings.controller';

describe('AdminSiteSettingsController', () => {
  let controller: AdminSiteSettingsController;
  let mockPrisma: object;
  let mockGetSettings: { execute: jest.Mock };
  let mockUpdateSettings: { execute: jest.Mock };

  const settings = { siteName: 'Sınav Salonu', heroTitle: 'Test Al' };

  beforeEach(() => {
    mockPrisma = {};
    mockGetSettings = { execute: jest.fn().mockResolvedValue(settings) };
    mockUpdateSettings = { execute: jest.fn().mockResolvedValue({ ...settings, siteName: 'Güncel Adı' }) };

    controller = new AdminSiteSettingsController(
      mockPrisma as any,
      mockGetSettings as any,
      mockUpdateSettings as any,
    );
  });

  describe('get', () => {
    it('site ayarlarını döndürür', async () => {
      const result = await controller.get();
      expect(mockGetSettings.execute).toHaveBeenCalledWith(mockPrisma);
      expect(result).toHaveProperty('siteName', 'Sınav Salonu');
    });
  });

  describe('update', () => {
    it('tüm DTO alanlarını iletiyor', async () => {
      const dto = {
        siteName: 'Güncel Adı',
        heroTitle: 'Yeni Başlık',
        heroSubtitle: 'Alt başlık',
        searchPlaceholder: 'Ara...',
        statTests: '100',
        statEducators: '50',
        statCandidates: '1000',
        statSuccessRate: '95',
        footerDescription: 'Footer',
        companyName: 'Şirket',
        contactEmail: 'info@example.com',
        contactPhone: '+905001234567',
        address: 'İstanbul',
        linkAbout: '/hakkimizda',
        linkPrivacy: '/gizlilik',
        linkContact: '/iletisim',
        linkPartnership: '/ortaklik',
        linkSupport: '/destek',
        copyrightText: '2024',
      } as any;
      const result = await controller.update(dto);
      expect(mockUpdateSettings.execute).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({ siteName: 'Güncel Adı', companyName: 'Şirket' }),
      );
      expect(result).toHaveProperty('siteName', 'Güncel Adı');
    });
  });
});
