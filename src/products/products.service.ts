import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Product } from './product.model';

export interface ProductPage {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product) private readonly productModel: typeof Product) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      return await this.productModel.create(createProductDto);
    } catch (error: unknown) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          `A product with productToken "${createProductDto.productToken}" already exists`,
        );
      }

      throw error;
    }
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productModel.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  async findAll(pagination: PaginationQueryDto): Promise<ProductPage> {
    const { page, limit } = pagination;
    const { count, rows } = await this.productModel.findAndCountAll({
      limit,
      offset: (page - 1) * limit,
      order: [['id', 'ASC']],
    });

    return {
      data: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: count === 0 ? 0 : Math.ceil(count / limit),
      },
    };
  }

  async updateStock(id: number, stock: number): Promise<Product> {
    const product = await this.productModel.findByPk(id);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    product.stock = stock;
    return product.save({ fields: ['stock'] });
  }
}
