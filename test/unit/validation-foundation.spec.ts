import { INestApplication, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { PaginationQueryDto } from '../../src/products/dto/pagination-query.dto';
import { UpdateStockDto } from '../../src/products/dto/update-stock.dto';
import { configureApp } from '../../src/app.setup';

describe('Task 2 FR-6, D-3, D-9 validation foundation', () => {
  async function validationErrors<T extends object>(
    dto: new () => T,
    value: Record<string, unknown>,
  ): Promise<string[]> {
    const instance = plainToInstance(dto, value);
    const errors = await validate(instance);
    return errors.flatMap((error) => Object.values(error.constraints ?? {}));
  }

  it('trims productToken and accepts allowed token characters', async () => {
    const product = plainToInstance(CreateProductDto, {
      productToken: ' sku-1_2 ',
      name: 'Example',
      price: '19.99',
      stock: 1,
    });

    expect(product.productToken).toBe('sku-1_2');
    expect(await validate(product)).toHaveLength(0);
  });

  it.each([
    ['non-string', 12],
    ['empty after trimming', '   '],
    ['too long', 'x'.repeat(65)],
    ['invalid characters', 'sku 1'],
  ])('rejects productToken that is %s', async (_caseName, productToken) => {
    await expect(
      validationErrors(CreateProductDto, {
        productToken,
        name: 'Example',
        price: '19.99',
        stock: 1,
      }),
    ).resolves.not.toHaveLength(0);
  });

  it('trims name and accepts a non-empty value within 255 characters', async () => {
    const product = plainToInstance(CreateProductDto, {
      productToken: 'sku-1',
      name: ' Example ',
      price: '19.99',
      stock: 1,
    });

    expect(product.name).toBe('Example');
    expect(await validate(product)).toHaveLength(0);
  });

  it.each([
    ['non-string', 12],
    ['empty after trimming', '   '],
    ['too long', 'x'.repeat(256)],
  ])('rejects name that is %s', async (_caseName, name) => {
    await expect(
      validationErrors(CreateProductDto, {
        productToken: 'sku-1',
        name,
        price: '19.99',
        stock: 1,
      }),
    ).resolves.not.toHaveLength(0);
  });

  it.each(['0', '19', '19.9', '19.99', '99999999.99'])
    ('accepts decimal string price %s', async (price) => {
      await expect(
        validationErrors(CreateProductDto, {
          productToken: 'sku-1',
          name: 'Example',
          price,
          stock: 1,
        }),
      ).resolves.toHaveLength(0);
    });

  it.each([19.99, '01.00', '1.234', '1e2', '100000000'])
    ('rejects invalid decimal string price %s', async (price) => {
      await expect(
        validationErrors(CreateProductDto, {
          productToken: 'sku-1',
          name: 'Example',
          price,
          stock: 1,
        }),
      ).resolves.not.toHaveLength(0);
    });

  it('requires every create product field, including stock', async () => {
    const errors = await validate(plainToInstance(CreateProductDto, {}));

    expect(errors.map((error) => error.property).sort()).toEqual(
      ['name', 'price', 'productToken', 'stock'].sort(),
    );
  });

  it.each([0, 10, 2147483647])('accepts integer stock %i', async (stock) => {
    await expect(validationErrors(UpdateStockDto, { stock })).resolves.toHaveLength(0);
  });

  it.each([-1, 1.5, '1', 2147483648])('rejects invalid stock %s', async (stock) => {
    await expect(validationErrors(UpdateStockDto, { stock })).resolves.not.toHaveLength(0);
  });

  it('requires stock for an update', async () => {
    await expect(validationErrors(UpdateStockDto, {})).resolves.not.toHaveLength(0);
  });

  it('defaults pagination to page 1 and limit 10', async () => {
    const query = plainToInstance(PaginationQueryDto, {});

    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
    expect(await validate(query)).toHaveLength(0);
  });

  it('transforms valid pagination query strings into integers', async () => {
    const query = plainToInstance(PaginationQueryDto, { page: '2', limit: '25' });

    expect(query.page).toBe(2);
    expect(query.limit).toBe(25);
    expect(await validate(query)).toHaveLength(0);
  });

  it.each([
    { query: { page: '0' }, rule: 'page lower bound' },
    { query: { page: '1.5' }, rule: 'integer page' },
    { query: { page: 'abc' }, rule: 'numeric page' },
    { query: { limit: '0' }, rule: 'limit lower bound' },
    { query: { limit: '101' }, rule: 'limit upper bound' },
    { query: { limit: '1.5' }, rule: 'integer limit' },
    { query: { limit: 'abc' }, rule: 'numeric limit' },
  ])('rejects invalid pagination value for $rule', async ({ query }) => {
    await expect(validationErrors(PaginationQueryDto, query)).resolves.not.toHaveLength(0);
  });

  it('registers the strict transforming global ValidationPipe', async () => {
    let registeredPipe: ValidationPipe | undefined;
    const app = {
      useGlobalPipes: (pipe: ValidationPipe): void => {
        registeredPipe = pipe;
      },
    } as INestApplication;

    configureApp(app);

    expect(registeredPipe).toBeInstanceOf(ValidationPipe);
    expect(registeredPipe).toMatchObject({
      validatorOptions: { whitelist: true, forbidNonWhitelisted: true },
    });

    if (!registeredPipe) {
      throw new Error('configureApp did not register a ValidationPipe');
    }

    await expect(
      registeredPipe.transform(
        { productToken: 'sku-1', name: 'Example', price: '1.00', stock: 1, id: 1 },
        { type: 'body', metatype: CreateProductDto, data: '' },
      ),
    ).rejects.toMatchObject({ status: 400 });

    const transformedQuery = await registeredPipe.transform(
      { page: '2', limit: '10' },
      { type: 'query', metatype: PaginationQueryDto, data: '' },
    );
    expect(transformedQuery).toMatchObject({ page: 2, limit: 10 });
    expect(typeof transformedQuery.page).toBe('number');
  });
});
