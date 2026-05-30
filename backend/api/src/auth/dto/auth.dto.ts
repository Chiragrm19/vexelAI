import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'Alice Johnson' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'alice@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+14155552671' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'alice@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password: string;
}

export class OnboardingDto {
  @ApiProperty({ example: 'Bob Smith' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'bob@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+14155550199' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'COMP-7X9K2M' })
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'SDE', required: false })
  @IsOptional()
  @IsString()
  jobRole?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'MyNewPass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
