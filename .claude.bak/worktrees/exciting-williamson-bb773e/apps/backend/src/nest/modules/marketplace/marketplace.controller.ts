import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../swagger/decorators';
import { ListMarketplaceTestsResponseDto } from './dto/marketplace-list.response.dto';
import { ListMarketplaceTestsUseCase } from '../../../application/use-cases/ListMarketplaceTestsUseCase';
import { Public } from '../../decorators/public.decorator';
import { ListMarketplaceTestsDto } from './dto/list-marketplace-tests.dto';

@Controller('marketplace')
@ApiTags('Marketplace')
export class MarketplaceController {
  constructor(private readonly listUC: ListMarketplaceTestsUseCase) {}

  @Public()
  @Get('tests')
  @ApiOkResponse({ type: ListMarketplaceTestsResponseDto })
  @ApiErrorResponses()
  async list(@Query() filters: ListMarketplaceTestsDto) {
    // ValidationPipe + transform will coerce query strings to proper types.
    return this.listUC.execute(filters);
  }
}

