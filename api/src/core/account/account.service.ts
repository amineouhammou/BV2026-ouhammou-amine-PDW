import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AccountEntity } from './data/entity/account.entity.js';
import { AccountResponseDto } from './data/dto/account-response.dto.js';
import { AccountStatus } from './account-status.enum.js';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async findById(id: string): Promise<AccountEntity | null> {
    return this.accountRepository.findOneBy({ id });
  }

  toResponse(account: AccountEntity): AccountResponseDto {
    return {
      id: account.id,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  async getAccountResponse(id: string): Promise<AccountResponseDto> {
    const account = await this.findById(id);

    if (!account) {
      throw new NotFoundException(`Account does not exist`);
    }

    return this.toResponse(account);
  }

  async findByIdInTransaction(
    manager: EntityManager,
    id: string,
  ): Promise<AccountEntity | null> {
    return manager.getRepository(AccountEntity).findOneBy({ id });
  }

  async create(manager: EntityManager): Promise<AccountEntity> {
    const repository = manager.getRepository(AccountEntity);
    const account = repository.create({
      status: AccountStatus.Active,
      anonymizedAt: null,
    });

    return repository.save(account);
  }

  canAuthenticate(account: AccountEntity): boolean {
    return account.status === AccountStatus.Active;
  }
}
