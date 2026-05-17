import { UserPublic } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { JwtService } from '../../../infrastructure/services/JwtService';
import { PasswordService } from '../../../infrastructure/services/PasswordService';
// LoginDTO previously lived in presentation layer; accept plain input here

/** Başarılı giriş sonucunda dönen kullanıcı bilgisi ve JWT token'ı. */
export interface LoginResult {
  user: UserPublic;
  token: string;
}

/**
 * Kullanıcı girişini yönetir.
 * E-posta/şifre doğrular, JWT token üretir.
 * Kullanıcı bulunamazsa veya şifre yanlışsa her iki durumda da aynı hata döner
 * (timing saldırısı önlemi ve bilgi ifşası engeli).
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * E-posta ve şifreyi doğrulayarak JWT token döner.
   * @param dto.email    - Kullanıcının e-posta adresi (boşluklar temizlenir, küçük harfe dönüştürülür).
   * @param dto.password - Kullanıcının şifresi (düz metin).
   * @throws {Error} INVALID_CREDENTIALS — e-posta/şifre boş, kullanıcı bulunamadı veya şifre yanlış.
   */
  async execute(dto: { email: string; password: string }): Promise<LoginResult> {
    // Girdi normalize edilir — boşluk içeren e-postalar ve tip dönüşüm sorunları giderilir
    const email = dto?.email ? String(dto.email).trim().toLowerCase() : '';
    const password = dto?.password != null ? String(dto.password) : '';
    if (!email || !password) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = await this.userRepository.findByEmail(email);
    // Kullanıcı bulunamasa da aynı hata fırlatılır — e-posta numaralandırmasını önler
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValid = await this.passwordService.compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // JWT payload: sub=userId, email, role — sunucu taraflı yetkilendirme için
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      token,
    };
  }
}
