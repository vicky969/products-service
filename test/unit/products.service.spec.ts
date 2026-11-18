import { describe, expect, it, jest } from '@jest/globals';
import { UniqueConstraintError } from 'sequelize';
import { Product } from '../../src/products/product.model';
import { CreateProductDto } from '../../src/products/dto/create-product.dto';
import { ProductsService } from '../../src/products/products.service';

describe('Task 3 FR-1, D-2, D-4, NFR-2 ProductsService.create', () => {
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

  it('persists and returns a valid product', async () => {
    const { service, createProduct } = createService();
    const savedProduct = { id: 1, ...dto } as unknown as Product;
    createProduct.mockResolvedValue(savedProduct);

    await expect(service.create(dto)).resolves.toBe(savedProduct);
    expect(createProduct).toHaveBeenCalledWith(dto);
  });

  it('maps an exact-token unique constraint error to the specified conflict', async () => {
    const { service, createProduct } = createService();
    createProduct.mockRejectedValue(
      new UniqueConstraintError({ message: 'duplicate token', errors: [] }),
    );

    await expect(service.create(dto)).rejects.toMatchObject({
      status: 409,
      message: 'A product with productToken "sku-1" already exists',
    });
  });

  it('rethrows unexpected persistence errors unchanged', async () => {
    const { service, createProduct } = createService();
    const unexpectedError = new Error('database unavailable');
    createProduct.mockRejectedValue(unexpectedError);

    await expect(service.create(dto)).rejects.toBe(unexpectedError);
  });
});
