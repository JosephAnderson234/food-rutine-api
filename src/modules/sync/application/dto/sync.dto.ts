import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SYNC_COLLECTIONS, type SyncCollection } from '../../domain/merge.js';

export class ChangeDto {
  @ApiProperty({ enum: SYNC_COLLECTIONS })
  @IsIn(SYNC_COLLECTIONS)
  collection: SyncCollection;

  @ApiProperty({ example: '2026-09-27:1:almuerzo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  docId: string;

  @ApiProperty({
    description: 'Documento completo; null = borrado',
    nullable: true,
  })
  @IsOptional()
  data: unknown;

  @ApiProperty({ example: '2026-09-28T13:05:00.000Z' })
  @IsDateString()
  clientUpdatedAt: string;
}

export class PushDto {
  @ApiProperty({ type: [ChangeDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ChangeDto)
  changes: ChangeDto[];
}

export class PullQueryDto {
  @ApiProperty({
    required: false,
    description: 'Cursor del último pull (0 = todo)',
    default: '0',
  })
  @IsOptional()
  @IsNumberString()
  since?: string;

  @ApiProperty({ required: false, default: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
