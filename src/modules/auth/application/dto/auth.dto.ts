import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token (credential) de Google Identity Services',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  refreshToken: string;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Segundos hasta que vence el access token' })
  expiresIn: number;
}
