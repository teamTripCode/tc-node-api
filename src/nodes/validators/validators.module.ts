import { Module } from '@nestjs/common';
import { ValidatorsService } from './validators.service';
import { ValidatorsController } from './validators.controller';

@Module({
  providers: [ValidatorsService],
  controllers: [ValidatorsController]
})
export class ValidatorsModule {}
