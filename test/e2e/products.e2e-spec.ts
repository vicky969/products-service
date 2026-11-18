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

interface ProductListResponse {
  data: ProductResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

describe('Products API - product operations', () => {
  let app: INestApplication | undefined;
  const createdTokens: string[] = [];

  function expectProductRows(actual: ProductResponse[], expected: Product[]): void {
    expect(actual).toHaveLength(expected.length);

    actual.forEach((product, index) => {
      const expectedProduct = expected[index];

      expect(product).toEqual({
        id: expectedProduct.id,
        productToken: expectedProduct.productToken,
        name: expectedProduct.name,
        price: expectedProduct.price,
        stock: expectedProduct.stock,
      });
      expect(typeof product.id).toBe('number');
      expect(typeof product.productToken).toBe('string');
      expect(typeof product.name).toBe('string');
      expect(typeof product.price).toBe('string');
      expect(typeof product.stock).toBe('number');
    });
  }

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

  it('uses the default page and limit when listing products', async () => {
    const total = await Product.count();
    const expectedProducts = await Product.findAll({
      limit: 10,
      order: [['id', 'ASC']],
    });
    const response = await request(app?.getHttpServer()).get('/products').expect(200);
    const result = response.body as ProductListResponse;

    expect(result.meta).toEqual({
      total,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(total / 10),
    });
    expect(result.data).toHaveLength(Math.min(total, 10));
    expectProductRows(result.data, expectedProducts);
    expect(result.data.map((product) => product.id)).toEqual(
      [...result.data.map((product) => product.id)].sort((left, right) => left - right),
    );
  });

  it('returns the third page in ascending id order', async () => {
    const tokenPrefix = `task5-page-three-${Date.now()}`;
    const products = Array.from({ length: 25 }, (_, index) => ({
      productToken: `${tokenPrefix}-${index}`,
      name: `Page product ${index}`,
      price: '1.00',
      stock: index,
    }));
    createdTokens.push(...products.map((product) => product.productToken));
    await Product.bulkCreate(products);

    const allProducts = await Product.findAll({ order: [['id', 'ASC']] });
    const allIds = allProducts.map((product) => product.id);
    const response = await request(app?.getHttpServer())
      .get('/products')
      .query({ page: 3, limit: 10 })
      .expect(200);
    const result = response.body as ProductListResponse;

    expect(result.data.map((product) => product.id)).toEqual(allIds.slice(20, 30));
    expectProductRows(result.data, allProducts.slice(20, 30));
    expect(result.meta).toEqual({
      total: allIds.length,
      page: 3,
      limit: 10,
      totalPages: Math.ceil(allIds.length / 10),
    });
  });

  it('returns an empty page beyond the last page with the correct total', async () => {
    const total = await Product.count();
    const limit = 10;
    const page = Math.ceil(total / limit) + 1;
    const response = await request(app?.getHttpServer())
      .get('/products')
      .query({ page, limit })
      .expect(200);
    const result = response.body as ProductListResponse;

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  it.each([
    { parameter: 'page', value: '0' },
    { parameter: 'page', value: '1.5' },
    { parameter: 'page', value: 'abc' },
    { parameter: 'limit', value: '0' },
    { parameter: 'limit', value: '101' },
    { parameter: 'limit', value: '1.5' },
    { parameter: 'limit', value: 'abc' },
  ])('rejects invalid $parameter value "$value" when listing products', async ({ parameter, value }) => {
    await request(app?.getHttpServer())
      .get('/products')
      .query({ [parameter]: value })
      .expect(400);
  });
});
