import { Test, TestingModule } from '@nestjs/testing';
import { ValidatorsController } from './validators.controller';

describe('ValidatorsController', () => {
  let controller: ValidatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValidatorsController],
    }).compile();

    controller = module.get<ValidatorsController>(ValidatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
