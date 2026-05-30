import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Admin signup — creates user + team */
  @Post('signup')
  @ApiOperation({ summary: 'Admin signup — creates account and team' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /** Login with email + password */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Employee onboarding — verify Company ID, send OTP */
  @Post('onboarding/init')
  @ApiOperation({ summary: 'Start employee onboarding via Company ID' })
  async initOnboarding(@Body() dto: OnboardingDto) {
    return this.authService.initOnboarding(dto);
  }

  /** Verify OTP and complete account creation */
  @Post('onboarding/verify')
  @ApiOperation({ summary: 'Verify OTP and complete employee setup' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /** Get current logged-in user */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
