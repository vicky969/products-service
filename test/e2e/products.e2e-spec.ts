import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/sequelize';
import request from 'supertest';
import { Sequelize } from 'sequelize-typescript';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Product } from '../../src/products/product.model';

interface ProductResponse {
  id: number;
  productToken: string;
  name: string;
  price: string;
  stock: number;
}

interface ValidationErrorResponse {
  statusCode: number;
  message: string[];
  error: string;
}

describe('Task 3 FR-1 AC-1.1 to AC-1.6 product creation', () => {
  let app: INestApplication | undefined;
  const createdTokens: string[] = [];

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
    const sequelize = app.get<Sequelize>(getConnectionToken());
    await sequelize.authenticate();
  });

  afterEach(async () => {
    for (const productToken of createdTokens.splice(0)) {
      await Product.destroy({ where: { productToken } });
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a product with a decimal string price (AC-1.1)', async () => {
    const productToken = `task3-create-${Date.now()}`;
    createdTokens.push(productToken);

    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken, name: 'Example', price: '29.95', stock: 10 })
      .expect(201);
    const product = response.body as ProductResponse;

    expect(product).toMatchObject({ productToken, name: 'Example', price: '29.95', stock: 10 });
    expect(typeof product.price).toBe('string');
    expect(product.id).toEqual(expect.any(Number));
  });

  it('returns 409 and the specified message for an exact duplicate token (AC-1.2)', async () => {
    const productToken = `task3-duplicate-${Date.now()}`;
    createdTokens.push(productToken);
    const body = { productToken, name: 'Example', price: '1.00', stock: 1 };

    await request(app?.getHttpServer()).post('/products').send(body).expect(201);
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send(body)
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: `A product with productToken "${productToken}" already exists`,
      error: 'Conflict',
    });
  });

  it('allows exactly one concurrent create for a token (NFR-2)', async () => {
    const productToken = `task3-concurrent-${Date.now()}`;
    createdTokens.push(productToken);
    const body = { productToken, name: 'Example', price: '1.00', stock: 1 };

    const responses = await Promise.all([
      request(app?.getHttpServer()).post('/products').send(body),
      request(app?.getHttpServer()).post('/products').send(body),
    ]);
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 409]);
  });

  it('allows tokens that differ only by case (AC-1.3)', async () => {
    const lowerToken = `sku-1-${Date.now()}`;
    const upperToken = lowerToken.toUpperCase();
    createdTokens.push(lowerToken, upperToken);

    const lowerResponse = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: lowerToken, name: 'Lower', price: '1.00', stock: 1 })
      .expect(201);
    const upperResponse = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: upperToken, name: 'Upper', price: '1.00', stock: 1 })
      .expect(201);

    expect((lowerResponse.body as ProductResponse).productToken).toBe(lowerToken);
    expect((upperResponse.body as ProductResponse).productToken).toBe(upperToken);
  });

  it('returns all validation errors for an invalid body (AC-1.4)', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: 'bad token', name: ' ', price: 19.99, stock: -1 })
      .expect(400);
    const error = response.body as ValidationErrorResponse;

    expect(error.statusCode).toBe(400);
    expect(error.message).toEqual(
      expect.arrayContaining([
        'productToken must match /^[A-Za-z0-9_-]+$/ regular expression',
        'name should not be empty',
        'price must be a string',
        'stock must not be less than 0',
      ]),
    );
  });

  it('rejects unknown properties (AC-1.5)', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: 'task3-unknown', name: 'Example', price: '1.00', stock: 1, id: 5 })
      .expect(400);
    const error = response.body as ValidationErrorResponse;

    expect(error.message).toContain('property id should not exist');
  });

  it('requires stock and rejects its omission (AC-1.6)', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: 'task3-missing-stock', name: 'Example', price: '1.00' })
      .expect(400);
    const error = response.body as ValidationErrorResponse;

    expect(error.message).toContain('stock must be an integer number');
  });
});
