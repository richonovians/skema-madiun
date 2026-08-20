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
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
/**
 * @Roles TETAP `Role.kabupaten` walau seluruh endpoint di sini kini khusus
 * superuser. Bukan kelalaian: RolesGuard meloloskan `kabupaten` DAN `superuser`
 * lewat bypass peran berhak penuh, jadi dekorator ini tak bisa membedakan
 * keduanya sama sekali. Yang menegakkan batasnya adalah
 * `UsersService.assertSuperuser` (403) -- lihat catatan panjang di sana.
 */
@Roles(Role.kabupaten)
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
