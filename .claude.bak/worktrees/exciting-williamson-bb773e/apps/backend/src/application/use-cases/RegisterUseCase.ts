import { randomUUID } from 'crypto';
import { User, UserPublic } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { PasswordService } from '../../infrastructure/services/PasswordService';
// RegisterDTO previously lived in presentation layer; accept plain input here

export class RegisterUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(dto: { email: string; username: string; password: string }): Promise<UserPublic> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user: User = {
      id: randomUUID(),
      email: dto.email.toLowerCase(),
      username: dto.username,
      passwordHash,
      role: 'CANDIDATE',
      status: 'ACTIVE',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.userRepository.save(user);

    return this.toPublic(saved);
  }

  private toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
