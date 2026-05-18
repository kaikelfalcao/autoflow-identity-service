import { Repository } from 'typeorm';

import { AdminRepository } from './admin.repository';
import { Admin } from './entities/admin.entity';

describe('AdminRepository', () => {
  let repo: AdminRepository;
  let typeormRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    typeormRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: Partial<Admin>) => data as Admin),
      save: jest.fn(),
    };
    repo = new AdminRepository(typeormRepo as unknown as Repository<Admin>);
  });

  it('findByEmail delegates to repository', async () => {
    const admin = { id: 'x', email: 'a@b.c' } as Admin;
    typeormRepo.findOne.mockResolvedValue(admin);
    await expect(repo.findByEmail('a@b.c')).resolves.toBe(admin);
    expect(typeormRepo.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.c' } });
  });

  it('findByEmail returns null when not found', async () => {
    typeormRepo.findOne.mockResolvedValue(null);
    await expect(repo.findByEmail('missing@x.com')).resolves.toBeNull();
  });

  it('findById delegates to repository', async () => {
    const admin = { id: 'abc' } as Admin;
    typeormRepo.findOne.mockResolvedValue(admin);
    await expect(repo.findById('abc')).resolves.toBe(admin);
    expect(typeormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'abc' } });
  });

  it('save creates and persists entity', async () => {
    const dto = { email: 'new@x.com', name: 'N' };
    const saved = { id: 'gen', ...dto } as Admin;
    typeormRepo.save.mockResolvedValue(saved);
    await expect(repo.save(dto)).resolves.toBe(saved);
    expect(typeormRepo.create).toHaveBeenCalledWith(dto);
    expect(typeormRepo.save).toHaveBeenCalled();
  });
});
