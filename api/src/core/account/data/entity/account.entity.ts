
import { Entity, Column } from 'typeorm';
import { BasePersistenceEntity } from '@common/database/entities/base-persistence.entity.js';
import { AccountStatus } from '@core/account/account-status.enum.js';

@Entity({ name: 'account' })
export class AccountEntity extends BasePersistenceEntity {
  @Column({
    name: 'status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.Active,
  })
  status!: AccountStatus;

  @Column({
    name: 'anonymized_at',
    type: 'timestamptz',
    nullable: true,
  })
  anonymizedAt!: Date | null;
}
