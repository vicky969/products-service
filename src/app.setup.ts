import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppExceptionFilter } from './app-exception.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
