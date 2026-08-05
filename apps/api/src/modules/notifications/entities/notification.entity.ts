import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

export class NotificationEntity extends BaseEntity<NotificationEntity> {
  id: number;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  title: string;
  message: string;

  @ApiPropertyOptional({ description: 'Path relatif frontend ke halaman terkait' })
  link: string | null;

  isRead: boolean;
  createdAt: Date;
}

export class UnreadCountEntity extends BaseEntity<UnreadCountEntity> {
  @ApiProperty()
  count: number;
}
