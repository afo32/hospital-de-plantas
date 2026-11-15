import { Global, Module } from '@nestjs/common';
import { OpenMeteoProvider } from './open-meteo.provider.js';
import { WeatherController } from './weather.controller.js';
import { WeatherService } from './weather.service.js';

@Global()
@Module({
  controllers: [WeatherController],
  providers: [WeatherService, OpenMeteoProvider],
  exports: [WeatherService],
})
export class WeatherModule {}
