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

describe('Products API - product deletion', () => {
  let app: INestApplication | undefined;
  const createdTokens: string[] = [];

  async function createProduct(productToken: string): Promise<ProductResponse> {
    createdTokens.push(productToken);
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({ productToken, name: 'Delete example', price: '12.50', stock: 4 })
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

  it('returns no content after deleting a product, and the product is then not found', async () => {
    const productToken = `task7-delete-${Date.now()}`;
    const product = await createProduct(productToken);

    const deleteResponse = await request(app?.getHttpServer())
      .delete(`/products/${product.id}`)
      .expect(204);

    expect(deleteResponse.text).toBe('');

    const getResponse = await request(app?.getHttpServer())
      .get(`/products/${product.id}`)
      .expect(404);
    expect(getResponse.body).toMatchObject({
      statusCode: 404,
      message: `Product with id ${product.id} not found`,
    });
  });

  it('returns not found when deleting an unknown product id', async () => {
    const id = 2147483000;
    const response = await request(app?.getHttpServer())
      .delete(`/products/${id}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: `Product with id ${id} not found`,
    });
  });

  it('allows a deleted product token to be reused', async () => {
    const productToken = `task7-reuse-${Date.now()}`;
    const firstProduct = await createProduct(productToken);

    await request(app?.getHttpServer()).delete(`/products/${firstProduct.id}`).expect(204);

    const recreatedProduct = await createProduct(productToken);
    expect(recreatedProduct.productToken).toBe(productToken);
    expect(recreatedProduct.id).not.toBe(firstProduct.id);
  });
});
