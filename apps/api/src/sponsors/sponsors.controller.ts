import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { SponsorTier, SponsorType, SponsorPlacement } from '@prisma/client';

// =============================================================================
// ADMIN CONTROLLER — Protected by SuperAdminGuard
// =============================================================================

@Controller('api/v1/admin/sponsors')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SponsorsAdminController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Post()
  async create(@Req() req: { user: { userId: string } }, @Body() body: unknown) {
    return this.sponsorsService.create(body, req.user.userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
    @Body() body: unknown,
  ) {
    return this.sponsorsService.update(id, body, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.sponsorsService.delete(id);
  }

  @Get()
  async findAll(
    @Query('tier') tier?: SponsorTier,
    @Query('sponsorType') sponsorType?: SponsorType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.sponsorsService.findAll({
      tier,
      sponsorType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  @Patch('reorder')
  async reorder(@Body() body: unknown) {
    return this.sponsorsService.reorder(body);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.sponsorsService.activate(id);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.sponsorsService.deactivate(id);
  }
}

// =============================================================================
// PUBLIC CONTROLLER — No auth required
// =============================================================================

@Controller('api/v1/public/sponsors')
export class SponsorsPublicController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  async findPublic(@Query('placement') placement?: SponsorPlacement) {
    const sponsors = await this.sponsorsService.findPublic(placement);

    // Track views for returned sponsors
    const ids = sponsors.map(s => s.id);
    this.sponsorsService.trackView(ids).catch(() => {});

    return sponsors;
  }

  @Get('featured')
  async findFeatured() {
    const sponsors = await this.sponsorsService.findFeatured();

    const ids = sponsors.map(s => s.id);
    this.sponsorsService.trackView(ids).catch(() => {});

    return sponsors;
  }

  @Post(':id/click')
  async trackClick(@Param('id') id: string) {
    return this.sponsorsService.trackClick(id);
  }

  // Postagens públicas dos Diamond sponsors
  @Get('posts')
  async getPublicPosts(@Query('limit') limit?: string) {
    const posts = await this.sponsorsService.getActivePublicPosts(
      limit ? parseInt(limit, 10) : 10
    );
    // Track views
    for (const p of posts) {
      this.sponsorsService.trackPostView(p.id).catch(() => {});
    }
    return posts;
  }

  @Post('posts/:postId/click')
  async trackPostClick(@Param('postId') postId: string) {
    return this.sponsorsService.trackPostClick(postId);
  }
}
