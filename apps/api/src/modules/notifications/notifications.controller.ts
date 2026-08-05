import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListNotificationQueryDto } from './dto/list-notification-query.dto';
import { NotificationEntity, UnreadCountEntity } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Notifikasi milik pengguna saat ini (semua peran terautentikasi). */
  @Get()
  @ApiOkResponse({ type: NotificationEntity, isArray: true })
  findMine(@Query() query: ListNotificationQueryDto, @CurrentUser() user: CurrentUser) {
    return this.notificationsService.findMine(query, user);
  }

  /** Jumlah belum dibaca -- utk lencana lonceng notifikasi. */
  @Get('unread-count')
  @ApiOkResponse({ type: UnreadCountEntity })
  async countUnread(@CurrentUser() user: CurrentUser): Promise<UnreadCountEntity> {
    const count = await this.notificationsService.countUnread(user);
    return new UnreadCountEntity({ count });
  }

  @Patch(':id/read')
  @ApiOkResponse({ type: NotificationEntity })
  markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUser) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: CurrentUser) {
    return this.notificationsService.markAllAsRead(user);
  }
}
