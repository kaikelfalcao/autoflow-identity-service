import { Injectable } from '@nestjs/common';

import { AdminRepository } from './admin.repository';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  findByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findByEmail(email);
  }

  findById(id: string): Promise<Admin | null> {
    return this.adminRepository.findById(id);
  }
}
