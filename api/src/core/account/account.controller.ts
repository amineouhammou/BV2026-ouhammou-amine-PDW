import { Controller, Get, Param } from '@nestjs/common';
import { AccountService } from '@core/account/account.service.js';
import { AccountResponseDto } from '@core/account/data/dto/account-response.dto.js';


@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AccountResponseDto> {
    return await this.accountService.getAccountResponse(id);
  }
}