import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService, JwtPayload } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/customer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de Customer via CPF' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'CPF inválido' })
  @ApiResponse({
    status: 401,
    description: 'Cliente não encontrado ou inativo',
  })
  @ApiResponse({ status: 503, description: 'order-service indisponível' })
  loginCustomer(@Body() dto: CustomerLoginDto): Promise<TokenResponseDto> {
    return this.authService.loginCustomer(dto);
  }

  @Post('login/admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de Admin via email e senha' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  @ApiResponse({ status: 400, description: 'Body inválido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  loginAdmin(@Body() dto: AdminLoginDto): Promise<TokenResponseDto> {
    return this.authService.loginAdmin(dto);
  }

  @Get('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verifica token JWT (usado pelo Kong)' })
  @ApiResponse({ status: 200, description: 'Claims do token' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async verify(
    @Headers('authorization') authHeader?: string,
  ): Promise<JwtPayload> {
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token ausente');
    }
    const token = authHeader.slice(7).trim();
    return this.authService.verifyToken(token);
  }
}
