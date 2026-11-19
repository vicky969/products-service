import { afterAll, afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
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

describe('Products API - stock update', () => {
  let app: INestApplication | undefined;
  const createdTokens: string[] = [];

  async function createProduct(name: string, price: string, stock: number): Promise<ProductResponse> {
    const productToken = `stock-update-${Date.now()}-${createdTokens.length}`;
    createdTokens.push(productToken);
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken, name, price, stock })
      .expect(201);

    return response.body as ProductResponse;
  }

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    for (const productToken of createdTokens.splice(0)) {
      await Product.destroy({ where: { productToken } });
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('updates stock and leaves the other product fields unchanged', async () => {
    const createdProduct = await createProduct('Stock example', '15.25', 10);

    const response = await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({ stock: 3 })
      .expect(200);

    expect(response.body as ProductResponse).toEqual({
      id: createdProduct.id,
      productToken: createdProduct.productToken,
      name: 'Stock example',
      price: '15.25',
      stock: 3,
    });
  });

  it('allows stock to be set to zero', async () => {
    const createdProduct = await createProduct('Zero stock example', '2.00', 1);

    const response = await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({ stock: 0 })
      .expect(200);

    expect((response.body as ProductResponse).stock).toBe(0);
  });

  it('rejects negative stock', async () => {
    const createdProduct = await createProduct('Negative stock example', '2.00', 5);

    await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({ stock: -1 })
      .expect(400);
  });

  it('rejects non-integer stock', async () => {
    const createdProduct = await createProduct('Fractional stock example', '2.00', 5);

    await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({ stock: 1.5 })
      .expect(400);
  });

  it('rejects a missing stock value', async () => {
    const createdProduct = await createProduct('Missing stock example', '2.00', 5);

    await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({})
      .expect(400);
  });

  it('rejects properties other than stock in an update request', async () => {
    const createdProduct = await createProduct('Extra property example', '2.00', 5);

    await request(app?.getHttpServer())
      .patch(`/products/${createdProduct.id}/stock`)
      .send({ stock: 4, price: '3.00' })
      .expect(400);
  });

  it('returns not found when updating an unknown product id', async () => {
    const id = 2147483000;
    const response = await request(app?.getHttpServer())
      .patch(`/products/${id}/stock`)
      .send({ stock: 4 })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: `Product with id ${id} not found`,
    });
  });
});
