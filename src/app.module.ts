import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { Product } from './products/product.model';
import { ProductsModule } from './products/products.module';

function parseDatabasePort(value: string | undefined): number {
  const port = Number(value ?? '3306');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }
  return port;
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProductsModule,
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SequelizeModuleOptions => ({
        dialect: 'mysql',
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: parseDatabasePort(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USER', 'products_app'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'ecommerce'),
        models: [Product],
        autoLoadModels: false,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class AppModule {}
