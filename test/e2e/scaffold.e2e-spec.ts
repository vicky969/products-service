import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, SequelizeModuleOptions } from '@nestjs/sequelize';
import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AppModule } from '../../src/app.module';
import { Product } from '../../src/products/product.model';

describe('Task 1 spec section 3, D-4, D-5, D-8, D-11, NFR-3 MySQL model and connection', () => {
  let app: INestApplicationContext | undefined;
  let sequelize: Sequelize;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    sequelize = app.get<Sequelize>(getConnectionToken());
    await sequelize.authenticate();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('connects to ecommerce_test and registers Product without timestamps', async () => {
    const databaseRows = await sequelize.query<{ databaseName: string }>(
      'SELECT DATABASE() AS databaseName',
      { type: QueryTypes.SELECT },
    );
    const productModel = sequelize.model('Product');

    expect(databaseRows[0]?.databaseName).toBe('ecommerce_test');
    expect(productModel.tableName).toBe('products');
    expect(productModel.options.timestamps).toBe(false);
  });

  it('keeps Sequelize synchronization disabled', () => {
    const sequelizeOptions = app?.get<SequelizeModuleOptions>('SequelizeModuleOptions');

    expect(sequelizeOptions?.synchronize).toBe(false);
  });

  it('has the approved product columns and types in MySQL', async () => {
    const columns = await sequelize.getQueryInterface().describeTable('products');

    expect(Object.keys(columns).sort()).toEqual(
      ['id', 'productToken', 'name', 'price', 'stock'].sort(),
    );
    expect(columns.id.type).toMatch(/unsigned/i);
    expect(columns.productToken.type).toMatch(/varchar\(64\)/i);
    expect(columns.name.type).toMatch(/varchar\(255\)/i);
    expect(columns.price.type).toMatch(/decimal\(10,2\)/i);
    expect(columns.stock.type).toMatch(/unsigned/i);
  });

  it('uses case-sensitive productToken uniqueness in MySQL', async () => {
    const collationRows = await sequelize.query<{ collationName: string }>(
      `SELECT COLLATION_NAME AS collationName
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND COLUMN_NAME = 'productToken'`,
      { type: QueryTypes.SELECT },
    );
    const transaction = await sequelize.transaction();
    const token = 'sku-1';
    const insert = (productToken: string) =>
      sequelize.query(
        `INSERT INTO products (productToken, name, price, stock)
         VALUES (:productToken, 'Task 1 test', '1.00', 1)`,
        { replacements: { productToken }, transaction },
      );

    try {
      await insert(token);
      await insert(token.toUpperCase());
      await expect(insert(token)).rejects.toBeInstanceOf(UniqueConstraintError);
      expect(collationRows[0]?.collationName).toBe('utf8mb4_bin');
    } finally {
      await transaction.rollback();
    }
  });

  it('keeps DECIMAL(10,2) prices as strings when persisted', async () => {
    const transaction = await sequelize.transaction();

    try {
      const product = await Product.create(
        {
          productToken: `price-check-${Date.now()}`,
          name: 'Price type check',
          price: '19.90',
          stock: 1,
        },
        { transaction },
      );
      const loadedProduct = await Product.findByPk(product.id, { transaction });

      expect(loadedProduct?.price).toBe('19.90');
      expect(typeof loadedProduct?.price).toBe('string');
    } finally {
      await transaction.rollback();
    }
  });
});
