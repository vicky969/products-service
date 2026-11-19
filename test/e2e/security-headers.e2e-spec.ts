import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request, { Response } from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Product } from '../../src/products/product.model';
import { ProductsService } from '../../src/products/products.service';

describe('HTTP security headers', () => {
  let app: INestApplication | undefined;

  function expectSecurityHeaders(response: Response): void {
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['permissions-policy']).toBe(
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    );
    expect(response.headers['content-security-policy']).toEqual(
      expect.stringContaining("default-src 'none'"),
    );
    expect(response.headers['content-security-policy']).toEqual(
      expect.stringContaining("frame-ancestors 'none'"),
    );
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['strict-transport-security']).toBeUndefined();
  }

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('adds headers to a successful response without changing its contract', async () => {
    const response = await request(app?.getHttpServer()).get('/products').expect(200);

    expectSecurityHeaders(response);
    expect(response.body).toMatchObject({
      data: expect.any(Array),
      meta: {
        total: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      },
    });
  });

  it('adds headers to a validation failure without changing its contract', async () => {
    const response = await request(app?.getHttpServer())
      .post('/products')
      .send({})
      .expect(400);

    expectSecurityHeaders(response);
    expect(response.body).toMatchObject({
      statusCode: 400,
      message: expect.any(Array),
      error: 'Bad Request',
    });
  });

  it('adds headers to a not-found response without changing its contract', async () => {
    const id = 2147483000;
    const response = await request(app?.getHttpServer()).get(`/products/${id}`).expect(404);

    expectSecurityHeaders(response);
    expect(response.body).toEqual({
      statusCode: 404,
      message: `Product with id ${id} not found`,
      error: 'Not Found',
    });
  });

  it('adds headers to a generic failure without changing its contract', async () => {
    const productsService = app?.get(ProductsService);
    if (!productsService) {
      throw new Error('ProductsService is not available');
    }

    const originalFindOne = productsService.findOne;
    productsService.findOne = async (): Promise<Product> => {
      throw new Error('forced security-header test failure');
    };

    try {
      const response = await request(app?.getHttpServer()).get('/products/1').expect(500);

      expectSecurityHeaders(response);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });
    } finally {
      productsService.findOne = originalFindOne;
    }
  });
});
