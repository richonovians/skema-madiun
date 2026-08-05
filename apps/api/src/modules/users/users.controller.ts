import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
@Roles(Role.kabupaten) // kabupaten = superuser (bypass RolesGuard, lihat guard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Daftar akun admin (paginated + filter role/OPD). */
  @Get()
  @ApiOkResponse({ type: UserEntity, isArray: true })
  findAll(@Query() query: ListUsersQueryDto): Promise<PaginatedResult<UserEntity>> {
    return this.usersService.findAll(query);
  }

  /** Buat akun admin (OPD/Kabupaten). */
  @Post()
  @Audit('user')
  @ApiOkResponse({ type: UserEntity })
  create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(dto);
  }

  /** Detail akun. */
  @Get(':id')
  @ApiOkResponse({ type: UserEntity })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserEntity> {
    return this.usersService.findOne(id);
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
  ): Promise<UserEntity> {
    return this.usersService.updateStatus(id, dto);
  }
}
