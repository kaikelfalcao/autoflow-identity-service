import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CustomerLoginDto {
  @ApiProperty({ example: '123.456.789-09', description: 'CPF com ou sem formatação' })
  @IsString()
  @IsNotEmpty()
  cpf!: string;
}
