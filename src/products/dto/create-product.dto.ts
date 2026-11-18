import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  productToken!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @Matches(/^(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?$/)
  price!: string;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  stock!: number;
}
