import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PushKeysDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(256) p256dh: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(256) auth: string;
}

/** Tal como la entrega `PushSubscription.toJSON()` en el navegador. */
export class SubscriptionDto {
  @ApiProperty()
  @IsUrl({ protocols: ['https'], require_tld: true })
  @MaxLength(1000)
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribeDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(1000) endpoint: string;
}

export class ReminderDto {
  @ApiProperty({ example: '2026-09-27|thaw|2026-09-27:3:almuerzo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key: string;

  @ApiProperty({ example: 'Pasar taper #5 del congelador a la refri' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '' })
  @IsString()
  @MaxLength(500)
  body: string;

  @ApiProperty({
    example: '/hoy',
    description: 'Ruta de la app que se abre al tocar el aviso',
  })
  @Matches(/^\/[\w\-/]*$/)
  @MaxLength(100)
  url: string;

  @ApiProperty({ example: '2026-09-30T02:00:00.000Z' })
  @IsDateString()
  fireAt: string;
}

export class ReplaceRemindersDto {
  @ApiProperty({ type: [ReminderDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReminderDto)
  reminders: ReminderDto[];
}
