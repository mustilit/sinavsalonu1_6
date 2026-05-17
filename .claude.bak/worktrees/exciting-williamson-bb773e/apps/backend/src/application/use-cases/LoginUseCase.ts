import { UserPublic } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { JwtService } from '../../infrastructure/services/JwtService';
import { PasswordService } from '../../infrastructure/services/PasswordService';
// LoginDTO previously lived in presentation layer; accept plain input here

export interface LoginResult {
  user: UserPublic;
  token: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService
  ) {}

  async execute(dto: { email: string; password: string }): Promise<LoginResult> {
    const email = dto?.email ? String(dto.email).trim().toLowerCase() : '';
    const password = dto?.password != null ? String(dto.password) : '';
    if (!email || !password) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isValid = await this.passwordService.compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

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
