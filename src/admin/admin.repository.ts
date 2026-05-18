import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(Admin)
    private readonly repo: Repository<Admin>,
  ) {}

  findByEmail(email: string): Promise<Admin | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<Admin | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(admin: Partial<Admin>): Promise<Admin> {
    const entity = this.repo.create(admin);
    return this.repo.save(entity);
  }
}
