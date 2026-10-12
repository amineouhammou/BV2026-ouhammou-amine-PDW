
import {
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  BeforeInsert,
} from 'typeorm';

import { ulid as createUlid } from 'ulid';

export abstract class BasePersistenceEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'varchar',
    length: 26,
  })
  id!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;

  @VersionColumn({
    name: 'version',
    type: 'integer',
  })
  version!: number;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = createUlid();
    }
  }
}
