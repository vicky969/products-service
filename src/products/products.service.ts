import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './product.model';

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
}
