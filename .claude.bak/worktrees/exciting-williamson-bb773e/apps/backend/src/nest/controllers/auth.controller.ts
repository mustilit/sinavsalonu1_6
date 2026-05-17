import { Controller, Post, Body, Get, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RegisterUseCase } from '../../application/use-cases/RegisterUseCase';
import { RegisterEducatorUseCase } from '../../application/use-cases/RegisterEducatorUseCase';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { Public } from '../decorators/public.decorator';
import { RegisterEducatorDto } from './dto/register-educator.dto';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { USER_REPO } from '../../application/constants';
import { Inject } from '@nestjs/common';
import { PrismaUserRepository } from '../../infrastructure/repositories/PrismaUserRepository';
import { PasswordService } from '../../infrastructure/services/PasswordService';
import { JwtService } from '../../infrastructure/services/JwtService';
import { LoginBruteforceGuard } from '../guards/login-bruteforce.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly registerEducatorUseCase: RegisterEducatorUseCase,
    private readonly loginUseCase: LoginUseCase,
    @Inject(USER_REPO) private readonly userRepo: IUserRepository,
  ) {}

  @Get('me')
  async me(@Req() req: any) {
    const sub = req.user?.sub;
    if (!sub) throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    const user = await this.userRepo.findById(sub);
    if (!user) throw new HttpException({ error: 'User not found' }, HttpStatus.NOT_FOUND);
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        educatorApprovedAt: user.educatorApprovedAt ?? undefined,
        createdAt: user.createdAt,
      },
    };
  }

  @Post('register')
  @Public()
  async register(@Body() body: any) {
    try {
      const user = await this.registerUseCase.execute(body);
      return user;
    } catch (err: any) {
      if (err.message === 'DUPLICATE_EMAIL') {
        throw new HttpException({ error: 'Bu e-posta adresi zaten kayıtlı.' }, HttpStatus.CONFLICT);
      }
      if (err.message === 'DUPLICATE_USERNAME') {
        throw new HttpException({ error: 'Bu kullanıcı adı zaten alınmış.' }, HttpStatus.CONFLICT);
      }
      throw new HttpException({ error: 'Kayıt sırasında hata oluştu' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('register/educator')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 300000 } })
  async registerEducator(@Body() body: RegisterEducatorDto) {
    try {
      return await this.registerEducatorUseCase.execute({
        email: body.email,
        username: body.username,
        password: body.password,
      });
    } catch (err: any) {
      if (err.code === 'CONTRACT_NOT_AVAILABLE') {
        throw new HttpException({ error: 'Eğitici sözleşmesi henüz tanımlanmamış.' }, HttpStatus.BAD_REQUEST);
      }
      if (err.message === 'DUPLICATE_EMAIL') {
        throw new HttpException({ error: 'Bu e-posta adresi zaten kayıtlı.' }, HttpStatus.CONFLICT);
      }
      if (err.message === 'DUPLICATE_USERNAME') {
        throw new HttpException({ error: 'Bu kullanıcı adı zaten alınmış.' }, HttpStatus.CONFLICT);
      }
      throw new HttpException({ error: 'Kayıt sırasında hata oluştu' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login')
  @Public()
  @UseGuards(LoginBruteforceGuard)
  async login(@Body() body: any) {
    const email = body?.email != null ? String(body.email).trim().toLowerCase() : '';
    const password = body?.password != null ? String(body.password) : '';
    if (!email || !password) {
      throw new HttpException(
        { error: 'E-posta ve şifre gerekli.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      // DI bazen dev ortamında undefined kalabiliyor (tsx watch + hot reload). Fail-safe:
      const uc = this.loginUseCase ?? new LoginUseCase(new PrismaUserRepository(), new PasswordService(), new JwtService());
      return await uc.execute({ email, password });
    } catch (err: any) {
      if (err?.message === 'INVALID_CREDENTIALS') {
        throw new HttpException({ error: 'E-posta veya şifre hatalı.' }, HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(
        { error: err?.message || 'Giriş sırasında hata oluştu' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

