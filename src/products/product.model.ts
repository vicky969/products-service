import { Optional } from 'sequelize';
import {
  AutoIncrement,
  Column,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface ProductAttributes {
  id: number;
  productToken: string;
  name: string;
  price: string;
  stock: number;
}

export type ProductCreationAttributes = Optional<ProductAttributes, 'id'>;

@Table({ tableName: 'products', timestamps: false })
export class Product extends Model<ProductAttributes, ProductCreationAttributes> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare id: number;

  @Index({ name: 'uq_products_product_token', unique: true })
  @Column({ type: DataType.STRING(64), allowNull: false })
  declare productToken: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare name: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare price: string;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare stock: number;
}