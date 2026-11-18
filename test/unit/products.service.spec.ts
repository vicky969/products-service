import { describe, expect, it, jest } from '@jest/globals';
import { UniqueConstraintError } from 'sequelize';
import { Product } from '../../src/products/product.model';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { ProductsService } from '../../src/products/products.service';

describe('Product creation service', () => {
  const dto: CreateProductDto = {
    productToken: 'sku-1',
    name: 'Example',
    price: '19.99',
    stock: 10,
  };

  function createService(): {
    service: ProductsService;
    createProduct: jest.Mock<(...args: Parameters<typeof Product.create>) => ReturnType<typeof Product.create>>;
  } {
    const createProduct = jest.fn<
      (...args: Parameters<typeof Product.create>) => ReturnType<typeof Product.create>
    >();
    const productModel = { create: createProduct } as unknown as typeof Product;

    return { service: new ProductsService(productModel), createProduct };
  }

  it('persists a valid product and returns it', async () => {
    const { service, createProduct } = createService();
    const savedProduct = { id: 1, ...dto } as unknown as Product;
    createProduct.mockResolvedValue(savedProduct);

    await expect(service.create(dto)).resolves.toBe(savedProduct);
    expect(createProduct).toHaveBeenCalledWith(dto);
  });

  it('maps a duplicate product token error to a conflict', async () => {
    const { service, createProduct } = createService();
    createProduct.mockRejectedValue(
      new UniqueConstraintError({ message: 'duplicate token', errors: [] }),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 409,
      message: 'A product with productToken "sku-1" already exists',
    });
  });

  it('rethrows unexpected persistence errors', async () => {
    const { service, createProduct } = createService();
    const unexpectedError = new Error('database unavailable');
    createProduct.mockRejectedValue(unexpectedError);

    await expect(service.create(dto)).rejects.toBe(unexpectedError);
  });
});

describe('The product lookup service finds a product by ID.', () => {
  function createReadService(): {
    service: ProductsService;
    findByPk: jest.Mock<(id: number) => Promise<Product | null>>;
  } {
    const findByPk = jest.fn<(id: number) => Promise<Product | null>>();
    const productModel = { findByPk } as unknown as typeof Product;

    return { service: new ProductsService(productModel), findByPk };
  }

  it('returns a product when the id exists', async () => {
    const { service, findByPk } = createReadService();
    const product = { id: 42 } as unknown as Product;
    findByPk.mockResolvedValue(product);

    await expect(service.findOne(42)).resolves.toBe(product);
    expect(findByPk).toHaveBeenCalledWith(42);
  });

  it('throws a not found error when the id is unknown', async () => {
    const { service, findByPk } = createReadService();
    findByPk.mockResolvedValue(null);

    await expect(service.findOne(42)).rejects.toMatchObject({
      status: 404,
      message: 'Product with id 42 not found',
    });
  });
});
