import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';

@Controller()
export class RootController {
  @Public()
  @Get('/')
  root() {
    return { status: 'ok', service: 'dal' };
  }
}

