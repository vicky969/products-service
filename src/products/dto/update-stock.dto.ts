import { IsInt, Max, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  stock!: number;
}
