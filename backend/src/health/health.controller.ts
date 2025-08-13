import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'LearnHub NestJS API',
      version: '1.0.0',
    };
  }
}