import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';
import { SessionEntity } from './entities/session.entity';
import { NonProductionGuard } from './guards/non-production.guard';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login sementara tanpa SSO (dev/staging) — 404 di production (lihat NonProductionGuard).
   * Digantikan callback SSO OAuth2 saat spec Helpdesk tersedia. Publik (tak perlu Bearer)
   * karena tujuannya justru MENERBITKAN Bearer token itu sendiri.
   */
  @Public()
  @UseGuards(NonProductionGuard)
  @Post('dev-login')
  @ApiOkResponse({ type: SessionEntity })
  devLogin(@Body() dto: DevLoginDto): Promise<SessionEntity> {
    return this.authService.devLogin(dto);
  }

  /** Keluar sesi (klien membuang token; lihat AuthService.logout). */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(): { success: true } {
    return this.authService.logout();
  }

  /** Profil pengguna aktif (semua peran terautentikasi). */
  @Get('me')
  @ApiOkResponse({ type: MeEntity })
  me(@CurrentUser() user: CurrentUser): Promise<MeEntity> {
    return this.authService.getMe(user);
  }

  /** Ubah profil/data diri (demografis khusus responden). */
  @Patch('profile')
  @ApiOkResponse({ type: MeEntity })
  updateProfile(
    @CurrentUser() user: CurrentUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeEntity> {
    return this.authService.updateProfile(user, dto);
  }
}
