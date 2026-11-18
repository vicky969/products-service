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

describe('Products API - product creation and retrieval', () => {
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

  it('creates a product with its price returned as a decimal string', async () => {
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

  it('returns a conflict for an exact duplicate product token', async () => {
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

  it('allows only one of two concurrent creates for a product token', async () => {
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

  it('treats product tokens as case-sensitive', async () => {
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

  it('reports all validation errors for an invalid request body', async () => {
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

  it('rejects unknown request properties', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: 'task3-unknown', name: 'Example', price: '1.00', stock: 1, id: 5 })
      .expect(400);
    const error = response.body as ValidationErrorResponse;

    expect(error.message).toContain('property id should not exist');
  });

  it('rejects a create request with missing stock', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken: 'task3-missing-stock', name: 'Example', price: '1.00' })
      .expect(400);
    const error = response.body as ValidationErrorResponse;

    expect(error.message).toContain('stock must be an integer number');
  });

  it('retrieves a product by its id', async () => {
    const productToken = `task4-get-${Date.now()}`;
    createdTokens.push(productToken);
    const createdResponse = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken, name: 'Get example', price: '12.50', stock: 4 })
      .expect(201);
    const createdProduct = createdResponse.body as ProductResponse;

    const response = await request(app?.getHttpServer())
      .get(`/products/${createdProduct.id}`)
      .expect(200);

    expect(response.body as ProductResponse).toMatchObject({
      id: createdProduct.id,
      productToken,
      name: 'Get example',
      price: '12.50',
      stock: 4,
    });
  });

  it('returns the not found message for an unknown product id', async () => {
    const id = 2147483000;
    const response = await request(app?.getHttpServer())
      .get(`/products/${id}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: `Product with id ${id} not found`,
      error: 'Not Found',
    });
  });

  it('rejects a non-integer product id', async () => {
    await request(app?.getHttpServer()).get('/products/abc').expect(400);
  });
});
