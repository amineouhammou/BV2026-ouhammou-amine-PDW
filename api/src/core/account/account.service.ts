
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountEntity } from './data/entity/account.entity.js';
import { AccountResponseDto } from './data/dto/account-response.dto.js';

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

  async getAccountResponse(
    id: string,
  ): Promise<AccountResponseDto> {
    const account = await this.findById(id);

    if (!account) {
      throw new NotFoundException(`Account does not exist`);
    }

    return this.toResponse(account);
  }
}
