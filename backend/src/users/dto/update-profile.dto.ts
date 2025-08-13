import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsIn, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['en', 'es', 'fr', 'de', 'zh', 'ja'])
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;

  @ApiProperty({ required: false })
  @IsOptional()
  learningGoals?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  skillLevel?: string;
}