import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SetActingRoleDto {
  @ApiProperty({
    enum: Role,
    description:
      'Peran yang ingin dipakai pada sesi ini. WAJIB salah satu role yang dimiliki akun; ' +
      'bila tidak, dijawab 403 -- endpoint ini tak dapat memberi hak baru.',
  })
  @IsEnum(Role)
  role: Role;
}
