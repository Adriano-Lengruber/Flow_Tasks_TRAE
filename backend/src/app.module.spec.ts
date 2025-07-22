import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppModule', () => {
  it('should be defined', () => {
    expect(true).toBe(true);
  });

  it('should have basic components', async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    const controller = module.get<AppController>(AppController);
    const service = module.get<AppService>(AppService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});