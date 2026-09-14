import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserEntity } from './entities/user.entity';
import { UserStatsEntity } from './entities/user-stats.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
/**
 * `@Roles(Role.superuser)` -- dan dekorator ini kini JUJUR. Sampai T6 dibereskan
 * (7 September 2026) ia tertulis `Role.kabupaten` justru karena isinya tak
 * berarti apa-apa: RolesGuard meloloskan `kabupaten` DAN `superuser` lewat
 * bypass menyeluruh, jadi nilai apa pun di sini sama saja.
 *
 * `UsersService.assertSuperuser` (403) DIPERTAHANKAN sebagai lapis kedua --
 * lihat catatan panjang di sana.
 */
@Roles(Role.superuser)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Daftar akun admin (paginated + filter role/OPD). Khusus superuser. */
  @Get()
  @ApiOkResponse({ type: UserEntity, isArray: true })
  findAll(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() actor: CurrentUser,
  ): Promise<PaginatedResult<UserEntity>> {
    return this.usersService.findAll(query, actor);
  }

  /** Buat akun admin (OPD/Kabupaten/Superuser). Khusus superuser. */
  @Post()
  @Audit('user')
  @ApiOkResponse({ type: UserEntity })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: CurrentUser): Promise<UserEntity> {
    return this.usersService.create(dto, actor);
  }

  /**
   * Jumlah akun aktif & total. Khusus superuser.
   *
   * DIDEKLARASIKAN SEBELUM `@Get(':id')`, dan urutannya bukan selera: Nest
   * memadankan rute berurutan, jadi bila ia di bawah, '/users/stats' tertangkap
   * sebagai ':id' dan ParseIntPipe menjawab 400 untuk kata "stats".
   */
  @Get('stats')
  @ApiOkResponse({ type: UserStatsEntity })
  getStats(@CurrentUser() actor: CurrentUser): Promise<UserStatsEntity> {
    return this.usersService.getStats(actor);
  }

  /** Detail akun. Khusus superuser. */
  @Get(':id')
  @ApiOkResponse({ type: UserEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: CurrentUser,
  ): Promise<UserEntity> {
    return this.usersService.findOne(id, actor);
  }

  /** Ubah akun (nama, OPD tautan, role). */
  @Patch(':id')
  @Audit('user')
  @ApiOkResponse({ type: UserEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: CurrentUser,
  ): Promise<UserEntity> {
    return this.usersService.update(id, dto, actor);
  }

  /** Aktif/nonaktifkan akun. */
  @Patch(':id/status')
  @Audit('user', 'update_status')
  @ApiOkResponse({ type: UserEntity })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: CurrentUser,
  ): Promise<UserEntity> {
    return this.usersService.updateStatus(id, dto, actor);
  }

  /**
   * Hapus akun (soft delete -- `deletedAt`+`isActive:false`, bukan hapus baris).
   * 2026-08-05: sebelumnya kolom `deletedAt` ada di skema tapi tanpa endpoint sama sekali.
   */
  @Delete(':id')
  @Audit('user', 'delete')
  @ApiOkResponse({ type: UserEntity })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: CurrentUser,
  ): Promise<UserEntity> {
    return this.usersService.remove(id, actor);
  }
}
