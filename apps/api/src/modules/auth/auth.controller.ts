import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
