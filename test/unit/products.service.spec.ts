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

describe('Product listing service', () => {
  interface FindAndCountOptions {
    limit: number;
    offset: number;
    order: Array<[string, 'ASC']>;
  }

  interface FindAndCountResult {
    count: number;
    rows: Product[];
  }

  function createListingService(): {
    service: ProductsService;
    findAndCountAll: jest.Mock<(options: FindAndCountOptions) => Promise<FindAndCountResult>>;
  } {
    const findAndCountAll = jest.fn<
      (options: FindAndCountOptions) => Promise<FindAndCountResult>
    >();
    const productModel = { findAndCountAll } as unknown as typeof Product;

    return { service: new ProductsService(productModel), findAndCountAll };
  }

  it('uses page and limit to query the correct offset and calculate metadata', async () => {
    const { service, findAndCountAll } = createListingService();
    const products = [{ id: 11 }, { id: 12 }] as unknown as Product[];
    findAndCountAll.mockResolvedValue({ count: 12, rows: products });

    await expect(service.findAll({ page: 3, limit: 5 })).resolves.toEqual({
      data: products,
      meta: { total: 12, page: 3, limit: 5, totalPages: 3 },
    });
    expect(findAndCountAll).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
      order: [['id', 'ASC']],
    });
  });

  it('returns empty data and zero total pages when no products exist', async () => {
    const { service, findAndCountAll } = createListingService();
    findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    await expect(service.findAll({ page: 1, limit: 10 })).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
    expect(findAndCountAll).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      order: [['id', 'ASC']],
    });
  });
});

describe('Product stock update service', () => {
  interface SaveStockOptions {
    fields: string[];
  }

  function createStockService(): {
    service: ProductsService;
    findByPk: jest.Mock<(id: number) => Promise<Product | null>>;
    save: jest.Mock<(options: SaveStockOptions) => Promise<Product>>;
  } {
    const findByPk = jest.fn<(id: number) => Promise<Product | null>>();
    const save = jest.fn<(options: SaveStockOptions) => Promise<Product>>();
    const productModel = { findByPk } as unknown as typeof Product;

    return { service: new ProductsService(productModel), findByPk, save };
  }

  it('updates only stock on an existing product', async () => {
    const { service, findByPk, save } = createStockService();
    const product = {
      id: 42,
      productToken: 'sku-42',
      name: 'Example',
      price: '19.99',
      stock: 10,
      save,
    } as unknown as Product;
    findByPk.mockResolvedValue(product);
    save.mockResolvedValue(product);

    await expect(service.updateStock(42, 3)).resolves.toBe(product);

    expect(findByPk).toHaveBeenCalledWith(42);
    expect(product).toMatchObject({
      id: 42,
      productToken: 'sku-42',
      name: 'Example',
      price: '19.99',
      stock: 3,
    });
    expect(save).toHaveBeenCalledWith({ fields: ['stock'] });
  });

  it('throws not found when the product id does not exist', async () => {
    const { service, findByPk } = createStockService();
    findByPk.mockResolvedValue(null);

    await expect(service.updateStock(42, 3)).rejects.toMatchObject({
      status: 404,
      message: 'Product with id 42 not found',
    });
  });
});

describe('Product deletion service', () => {
  interface DestroyOptions {
    where: { id: number };
  }

  function createDeleteService(): {
    service: ProductsService;
    destroy: jest.Mock<(options: DestroyOptions) => Promise<number>>;
  } {
    const destroy = jest.fn<(options: DestroyOptions) => Promise<number>>();
    const productModel = { destroy } as unknown as typeof Product;

    return { service: new ProductsService(productModel), destroy };
  }

  it('resolves when one product row is deleted', async () => {
    const { service, destroy } = createDeleteService();
    destroy.mockResolvedValue(1);

    await expect(service.remove(42)).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledWith({ where: { id: 42 } });
  });

  it('throws not found when no product row is deleted', async () => {
    const { service, destroy } = createDeleteService();
    destroy.mockResolvedValue(0);

    await expect(service.remove(42)).rejects.toMatchObject({
      status: 404,
      message: 'Product with id 42 not found',
    });
    expect(destroy).toHaveBeenCalledWith({ where: { id: 42 } });
  });
});
