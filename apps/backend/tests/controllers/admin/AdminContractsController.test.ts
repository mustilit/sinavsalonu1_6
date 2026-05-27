/**
 * AdminContractsController unit testleri.
 */
import { AdminContractsController } from '../../../src/nest/controllers/admin.contracts.controller';
import { HttpException } from '@nestjs/common';

describe('AdminContractsController', () => {
  let controller: AdminContractsController;
  let mockContractRepo: { getById: jest.Mock; setActive: jest.Mock };
  let mockListContracts: { execute: jest.Mock };
  let mockCreateContract: { execute: jest.Mock };
  let mockUpdateContract: { execute: jest.Mock };

  const contract = { id: 'c-1', type: 'EDUCATOR', version: 1, title: 'Sözleşme v1', content: '...', isActive: false };

  beforeEach(() => {
    mockContractRepo = {
      getById: jest.fn().mockResolvedValue(contract),
      setActive: jest.fn().mockResolvedValue({ ...contract, isActive: true }),
    };
    mockListContracts = { execute: jest.fn().mockResolvedValue([contract]) };
    mockCreateContract = { execute: jest.fn().mockResolvedValue(contract) };
    mockUpdateContract = { execute: jest.fn().mockResolvedValue({ ...contract, title: 'Güncel' }) };

    controller = new AdminContractsController(
      mockContractRepo as any,
      mockListContracts as any,
      mockCreateContract as any,
      mockUpdateContract as any,
    );
  });

  describe('list', () => {
    it('sözleşmeleri listeler', async () => {
      const result = await controller.list();
      expect(mockListContracts.execute).toHaveBeenCalledWith(undefined);
      expect(result).toBeInstanceOf(Array);
    });

    it('EDUCATOR type filtresiyle listeler', async () => {
      const result = await controller.list('EDUCATOR');
      expect(mockListContracts.execute).toHaveBeenCalledWith('EDUCATOR');
    });

    it('CANDIDATE type filtresiyle listeler', async () => {
      await controller.list('CANDIDATE');
      expect(mockListContracts.execute).toHaveBeenCalledWith('CANDIDATE');
    });

    it('geçersiz type undefined olarak iletilir', async () => {
      await controller.list('INVALID');
      expect(mockListContracts.execute).toHaveBeenCalledWith(undefined);
    });
  });

  describe('create', () => {
    it('yeni sözleşme oluşturur', async () => {
      const body = { type: 'EDUCATOR', version: 1, title: 'Sözleşme v1', content: '...', isActive: false };
      const result = await controller.create(body);
      expect(mockCreateContract.execute).toHaveBeenCalledWith(body);
      expect(result).toHaveProperty('id', 'c-1');
    });
  });

  describe('update', () => {
    it('sözleşme günceller', async () => {
      const body = { title: 'Güncel Başlık' };
      const result = await controller.update('c-1', body);
      expect(mockUpdateContract.execute).toHaveBeenCalledWith('c-1', body);
      expect(result).toHaveProperty('title', 'Güncel');
    });
  });

  describe('setActive', () => {
    it('sözleşmeyi aktif yapar', async () => {
      const result = await controller.setActive('c-1');
      expect(mockContractRepo.getById).toHaveBeenCalledWith('c-1');
      expect(mockContractRepo.setActive).toHaveBeenCalledWith('EDUCATOR', 'c-1');
    });

    it('sözleşme bulunamazsa 404 fırlatır', async () => {
      mockContractRepo.getById.mockResolvedValue(null);
      await expect(controller.setActive('not-exists')).rejects.toThrow(HttpException);
    });
  });
});
