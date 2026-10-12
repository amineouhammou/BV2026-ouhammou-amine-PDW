import { AccountStatus } from '@core/account/account-status.enum.js';


export class AccountResponseDto {
  id!: string;

  status!: AccountStatus;

  createdAt!: string;

  updatedAt!: string;
}
