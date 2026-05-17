---
name: nestjs-module
description: NestJS modül iskeleti — Controller/Service/DTO/Guard/Interceptor pattern'leri. Yeni domain modülü kurulurken veya endpoint eklenirken referans alın.
---

# NestJS Modül Pattern'i

> **⚠️ Proje Notu:** Sinav Salonu **feature-module** değil **Clean Architecture** kullanır.
> Gerçek yapı için `backend-architect` agent ve `exam-domain` skill'ine bak.
> Bu skill generic NestJS pattern referansı — kavramsal kılavuz olarak kullan.
>
> **Gerçek proje dizini:**
> ```
> apps/backend/src/
>   nest/controllers/           → Controller dosyaları (HTTP katmanı)
>   nest/controllers/dto/       → DTO sınıfları
>   nest/guards/                → JWT, Roles, WorkerPermissions
>   application/use-cases/<domain>/ → İş mantığı (Service değil UseCase)
>   nest/app.module.ts          → Tüm controller/provider tek modülde
> ```
> Yeni endpoint: controller + use-case yaz, `app.module.ts`'e kayıt et.

## Referans Yapısı (Generic)

```
src/modules/exam/
  exam.module.ts
  exam.controller.ts
  exam.service.ts
  dto/
    create-exam.dto.ts
    update-exam.dto.ts
    exam-response.dto.ts
  guards/
    exam-owner.guard.ts   (domain-specific)
  __tests__/
    exam.controller.spec.ts
    exam.service.spec.ts
```

## Module

```ts
import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
```

## Controller

Controller ince. HTTP'yi domain'e çevirir, validation guard'larla zaten yapılmış, iş mantığı service'de.

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamService } from './exam.service';

@Controller('exams')
export class ExamController {
  constructor(private readonly exams: ExamService) {}

  @Get()
  list() {
    return this.exams.findPublished();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.exams.findByIdOrThrow(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() userId: string, @Body() dto: CreateExamDto) {
    return this.exams.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.exams.updateAsOwner(userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.exams.deleteAsOwner(userId, id);
  }
}
```

## Service

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  findPublished() {
    return this.prisma.exam.findMany({
      where: { publishedAt: { not: null } },
      select: { id: true, title: true, price: true, educatorId: true },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async findByIdOrThrow(id: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException(`Exam ${id} not found`);
    return exam;
  }

  create(educatorId: string, dto: CreateExamDto) {
    return this.prisma.exam.create({ data: { ...dto, educatorId } });
  }

  async updateAsOwner(userId: string, id: string, dto: Partial<CreateExamDto>) {
    const exam = await this.findByIdOrThrow(id);
    if (exam.educatorId !== userId) throw new ForbiddenException();
    return this.prisma.exam.update({ where: { id }, data: dto });
  }

  async deleteAsOwner(userId: string, id: string) {
    const exam = await this.findByIdOrThrow(id);
    if (exam.educatorId !== userId) throw new ForbiddenException();
    return this.prisma.exam.delete({ where: { id } });
  }
}
```

## DTO

```ts
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExamDto {
  @IsString() @MinLength(3) @MaxLength(200)
  title!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsPositive()
  price!: number;

  @IsInt() @IsPositive()
  durationMinutes!: number;
}
```

`UpdateExamDto` için `PartialType`:
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateExamDto } from './create-exam.dto';
export class UpdateExamDto extends PartialType(CreateExamDto) {}
```

## Guard

```ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    // JWT doğrula, request.user set et, true dön
  }
}
```

Domain guard örneği (owner kontrolü):
```ts
@Injectable()
export class ExamOwnerGuard implements CanActivate {
  constructor(private readonly exams: ExamService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const exam = await this.exams.findByIdOrThrow(req.params.id);
    return exam.educatorId === req.user.id;
  }
}
```

## Exception Filter

Global filter `main.ts`'te:
```ts
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

## Interceptor (opsiyonel)

Response shape için:
```ts
@Injectable()
export class ResponseShapeInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => ({ data, timestamp: new Date().toISOString() })));
  }
}
```

## Swagger (opsiyonel)

```ts
@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamController { ... }
```
