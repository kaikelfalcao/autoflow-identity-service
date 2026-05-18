import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { Admin } from './entities/admin.entity';

describe('AdminService', () => {
  let service: AdminService;
  let repo: { findByEmail: jest.Mock; findById: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    repo = { findByEmail: jest.fn(), findById: jest.fn(), save: jest.fn() };
    service = new AdminService(repo as unknown as AdminRepository);
  });

  it('delegates findByEmail', async () => {
    const admin = { id: 'x', email: 'a@b.c' } as Admin;
    repo.findByEmail.mockResolvedValue(admin);
    await expect(service.findByEmail('a@b.c')).resolves.toBe(admin);
  });

  it('delegates findById', async () => {
    const admin = { id: 'x' } as Admin;
    repo.findById.mockResolvedValue(admin);
    await expect(service.findById('x')).resolves.toBe(admin);
  });

  it('returns null when not found', async () => {
    repo.findByEmail.mockResolvedValue(null);
    await expect(service.findByEmail('missing@x.com')).resolves.toBeNull();
  });
});
