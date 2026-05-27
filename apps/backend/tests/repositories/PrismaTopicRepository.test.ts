/**
 * PrismaTopicRepository unit testleri
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    topic: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { PrismaTopicRepository } from '../../src/infrastructure/repositories/PrismaTopicRepository';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeRow = (id: string, name: string, slug: string) => ({
  id,
  name,
  slug,
  active: true,
  createdAt: new Date(),
  examTypes: [{ examTypeId: 'et-1' }],
});

describe('PrismaTopicRepository', () => {
  let repo: PrismaTopicRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaTopicRepository();
  });

  describe('create', () => {
    it('topic oluşturulur ve Topic domain nesnesi döner', async () => {
      mock.topic.create.mockResolvedValue(makeRow('t-1', 'Matematik', 'matematik'));
      const result = await repo.create({ examTypeId: 'et-1', name: 'Matematik', slug: 'matematik' });
      expect(result.id).toBe('t-1');
      expect(result.examTypeId).toBe('et-1');
    });
  });

  describe('findById', () => {
    it('kayıt bulunursa Topic döner', async () => {
      mock.topic.findUnique.mockResolvedValue(makeRow('t-1', 'Türkçe', 'turkce'));
      const result = await repo.findById('t-1');
      expect(result?.name).toBe('Türkçe');
    });

    it('kayıt bulunamazsa null döner', async () => {
      mock.topic.findUnique.mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByExamTypeAndSlug', () => {
    it('eşleşme varsa Topic döner', async () => {
      mock.topic.findFirst.mockResolvedValue(makeRow('t-1', 'Tarih', 'tarih'));
      const result = await repo.findByExamTypeAndSlug('et-1', 'tarih');
      expect(result?.slug).toBe('tarih');
    });

    it('eşleşme yoksa null döner', async () => {
      mock.topic.findFirst.mockResolvedValue(null);
      const result = await repo.findByExamTypeAndSlug('et-1', 'unknown');
      expect(result).toBeNull();
    });
  });

  describe('listByExamType', () => {
    it('birden fazla topic dizi olarak döner', async () => {
      mock.topic.findMany.mockResolvedValue([
        makeRow('t-1', 'Tarih', 'tarih'),
        makeRow('t-2', 'Coğrafya', 'cografya'),
      ]);
      const result = await repo.listByExamType('et-1');
      expect(result).toHaveLength(2);
    });

    it('activeOnly:true where kısmına active:true ekler', async () => {
      mock.topic.findMany.mockResolvedValue([]);
      await repo.listByExamType('et-1', true);
      const where = mock.topic.findMany.mock.calls[0][0].where;
      expect(where.active).toBe(true);
    });
  });

  describe('delete', () => {
    it('silme başarılıysa true döner', async () => {
      mock.topic.deleteMany.mockResolvedValue({ count: 1 });
      const result = await repo.delete('t-1');
      expect(result).toBe(true);
    });

    it('kayıt bulunamazsa false döner', async () => {
      mock.topic.deleteMany.mockResolvedValue({ count: 0 });
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });
  });
});
