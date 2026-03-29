import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import {
  generatePixCode as buildPixCode,
  generatePixQrCode,
  generatePixTxId,
  PixConfig,
} from '../common/pix.utils';

// =============================================================================
// SCHEMAS
// =============================================================================

const createInviteSchema = z.object({
  companyName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().min(8).max(20).optional().nullable(),
  personalMessage: z.string().max(2000).optional().nullable(),
  proposedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']).default('GOLD'),
  proposedType: z.enum(['BRAND', 'SUPPLIER', 'OFFICIAL_PARTNER', 'EDUCATIONAL_PARTNER', 'TECH_PARTNER', 'CAMPAIGN_PARTNER']).default('BRAND'),
  proposedBenefits: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(365).default(30),
  notes: z.string().max(2000).optional().nullable(),
});

const createUniversalInviteSchema = z.object({
  universalTitle: z.string().max(200).optional().nullable(),
  personalMessage: z.string().max(2000).optional().nullable(),
  proposedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']).default('GOLD'),
  proposedBenefits: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(365).default(90),
  notes: z.string().max(2000).optional().nullable(),
});

const selfRegisterSchema = z.object({
  // Dados da empresa
  companyName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(20).optional().nullable(),
  companyDocument: z.string().max(30).optional().nullable(),
  companyAddress: z.string().max(300).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  // Parceria escolhida
  selectedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']),
  selectedType: z.enum(['BRAND', 'SUPPLIER', 'OFFICIAL_PARTNER', 'EDUCATIONAL_PARTNER', 'TECH_PARTNER', 'CAMPAIGN_PARTNER']).default('BRAND'),
  durationMonths: z.number().min(1).max(36).default(6),
  // Senha (para Diamond terá acesso ao painel)
  password: z.string().min(6).max(200).optional(),
  // Aceite dos termos
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Você deve aceitar os termos do contrato' }) }),
  // Assinatura
  signedByName: z.string().min(2).max(120),
});

export type CreateSponsorInviteDto = z.infer<typeof createInviteSchema>;
export type SelfRegisterDto = z.infer<typeof selfRegisterSchema>;

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class SponsorInvitesService {
  private readonly logger = new Logger(SponsorInvitesService.name);

  constructor(private prisma: PrismaService) {}

  // ---- ADMIN ----

  async create(raw: unknown, userId: string) {
    const data = createInviteSchema.parse(raw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    return this.prisma.sponsorInvite.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        personalMessage: data.personalMessage ?? null,
        proposedTier: data.proposedTier,
        proposedType: data.proposedType,
        proposedBenefits: data.proposedBenefits,
        notes: data.notes ?? null,
        expiresAt,
        createdByUserId: userId,
      },
    });
  }

  async createUniversal(raw: unknown, userId: string) {
    const data = createUniversalInviteSchema.parse(raw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    return this.prisma.sponsorInvite.create({
      data: {
        isUniversal: true,
        universalTitle: data.universalTitle ?? 'Seja nosso parceiro!',
        companyName: '',
        contactName: '',
        personalMessage: data.personalMessage ?? null,
        proposedTier: data.proposedTier,
        proposedBenefits: data.proposedBenefits,
        notes: data.notes ?? null,
        expiresAt,
        createdByUserId: userId,
      },
    });
  }

  async findAll(filters?: { status?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.sponsorInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    return invite;
  }

  async cancel(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    return this.prisma.sponsorInvite.delete({ where: { id } });
  }

  async resend(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.sponsorInvite.update({
      where: { id },
      data: { status: 'PENDING', expiresAt, viewCount: 0, ctaClickedAt: null, respondedAt: null },
    });
  }

  // ---- PUBLIC ----

  async findByToken(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      if (invite.status !== 'EXPIRED') {
        await this.prisma.sponsorInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      }
      return { expired: true, companyName: invite.companyName || 'Convite', isUniversal: invite.isUniversal };
    }

    // Increment views
    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        status: invite.status === 'PENDING' ? 'VIEWED' : undefined,
      },
    });

    return {
      expired: false,
      isUniversal: invite.isUniversal,
      universalTitle: invite.universalTitle,
      companyName: invite.companyName,
      contactName: invite.contactName,
      personalMessage: invite.personalMessage,
      proposedTier: invite.proposedTier,
      proposedType: invite.proposedType,
      proposedBenefits: invite.proposedBenefits,
      expiresAt: invite.expiresAt,
    };
  }

  async registerCtaClick(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: {
        ctaClickedAt: invite.ctaClickedAt ?? new Date(),
        status: ['PENDING', 'VIEWED'].includes(invite.status) ? 'CLICKED_CTA' : undefined,
      },
    });
    return { success: true };
  }

  async acceptInvite(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado');
    }

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    return { success: true, message: 'Parceria aceita com sucesso!' };
  }

  async declineInvite(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
    return { success: true };
  }

  // ---- SELF-REGISTRATION (from invite page) ----

  async selfRegister(token: string, raw: unknown, ip: string) {
    const data = selfRegisterSchema.parse(raw);

    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    // Universal invites can be reused; directed invites cannot be re-accepted
    if (!invite.isUniversal && ['EXPIRED', 'ACCEPTED', 'DECLINED'].includes(invite.status)) {
      throw new BadRequestException('Convite não disponível para cadastro');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado');
    }

    // Check email uniqueness for sponsors
    const existingByEmail = await this.prisma.sponsor.findUnique({ where: { email: data.contactEmail } });
    if (existingByEmail) throw new BadRequestException('Email já está em uso por outro patrocinador');

    const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingSlug = await this.prisma.sponsor.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

    // Tier-specific benefits
    const benefits = this.getBenefitsForTier(data.selectedTier);
    const obligations = this.getObligationsForTier(data.selectedTier);

    // Calculate contract dates
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + data.durationMonths);

    // Generate contract number
    const contractNumber = `BP-${data.selectedTier.charAt(0)}${data.selectedTier.charAt(1)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Hash password if provided (Diamond)
    let passwordHash: string | null = null;
    if (data.password && data.selectedTier === 'DIAMOND') {
      passwordHash = await hash(data.password);
    }

    // Transaction: create sponsor + contract + payment + update invite
    const result = await this.prisma.$transaction(async (tx) => {
      const sponsor = await tx.sponsor.create({
        data: {
          name: data.companyName,
          slug: finalSlug,
          description: data.description,
          websiteUrl: data.websiteUrl,
          tier: data.selectedTier,
          sponsorType: data.selectedType,
          placementScopes: ['ALL'],
          isActive: false, // Aguardando pagamento
          contractStartsAt: startsAt,
          contractEndsAt: endsAt,
          email: data.contactEmail,
          passwordHash,
        },
      });

      const contract = await tx.sponsorContract.create({
        data: {
          contractNumber,
          sponsorId: sponsor.id,
          sponsorName: data.companyName,
          sponsorEmail: data.contactEmail,
          sponsorPhone: data.contactPhone,
          sponsorDocument: data.companyDocument,
          sponsorAddress: data.companyAddress,
          contactPersonName: data.contactName,
          tier: data.selectedTier,
          sponsorType: data.selectedType,
          benefits,
          obligations,
          startsAt,
          endsAt,
          durationMonths: data.durationMonths,
          status: 'PENDING_PAYMENT',
          signedAt: new Date(),
          signedByName: data.signedByName,
          signedByIp: ip,
        },
      });

      // Calcular preço e gerar PIX
      const amountCents = this.TIER_PRICING[data.selectedTier]?.[data.durationMonths] || 0;
      const description = `BELAPRO ${data.selectedTier} ${data.durationMonths}M`;

      // Buscar config PIX da plataforma (SystemSettings)
      const pixConfig = await this.getSystemPixConfig();
      const txId = generatePixTxId();
      const pixCode = buildPixCode(pixConfig, amountCents, txId, description);
      const pixQrCode = await generatePixQrCode(pixCode);

      const pixExpiresAt = new Date();
      pixExpiresAt.setHours(pixExpiresAt.getHours() + 48); // PIX válido por 48h

      const payment = await tx.sponsorPayment.create({
        data: {
          contractId: contract.id,
          amountCents,
          tier: data.selectedTier,
          durationMonths: data.durationMonths,
          status: 'PENDING',
          pixCode,
          pixQrCode,
          pixExpiresAt,
        },
      });

      // Update invite: universal stays active (increment usage), directed gets accepted
      if (invite.isUniversal) {
        await tx.sponsorInvite.update({
          where: { id: invite.id },
          data: {
            usageCount: { increment: 1 },
          },
        });
      } else {
        await tx.sponsorInvite.update({
          where: { id: invite.id },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
            convertedSponsorId: sponsor.id,
          },
        });
      }

      return { sponsor, contract, payment };
    });

    this.logger.log(`Self-registration: ${data.companyName} (${data.selectedTier}) — contract ${contractNumber} — PENDING_PAYMENT`);

    const amountCents = this.TIER_PRICING[data.selectedTier]?.[data.durationMonths] || 0;

    return {
      success: true,
      sponsorId: result.sponsor.id,
      contractNumber: result.contract.contractNumber,
      contractId: result.contract.id,
      paymentId: result.payment.id,
      tier: data.selectedTier,
      isDiamond: data.selectedTier === 'DIAMOND',
      pendingPayment: true,
      payment: {
        amountCents,
        amountFormatted: `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}`,
        pixCode: result.payment.pixCode,
        pixQrCode: result.payment.pixQrCode,
        pixExpiresAt: result.payment.pixExpiresAt,
        durationMonths: data.durationMonths,
      },
    };
  }

  // ---- PAYMENT CONFIRMATION ----

  async confirmPayment(
    paymentId: string,
    adminUserId: string,
    data: { paidByName?: string; transactionId?: string; notes?: string },
  ) {
    const payment = await this.prisma.sponsorPayment.findUnique({
      where: { id: paymentId },
      include: { contract: { include: { sponsor: true } } },
    });

    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Pagamento não está pendente');
    }

    // Calculate new contract dates from now (payment date)
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + payment.durationMonths);

    await this.prisma.$transaction(async (tx) => {
      // Update payment
      await tx.sponsorPayment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidByName: data.paidByName,
          paymentMethod: 'PIX',
          transactionId: data.transactionId,
          confirmedBy: adminUserId,
          notes: data.notes,
        },
      });

      // Activate contract
      await tx.sponsorContract.update({
        where: { id: payment.contractId },
        data: {
          status: 'ACTIVE',
          startsAt,
          endsAt,
        },
      });

      // Activate sponsor
      await tx.sponsor.update({
        where: { id: payment.contract.sponsorId },
        data: {
          isActive: true,
          contractStartsAt: startsAt,
          contractEndsAt: endsAt,
        },
      });
    });

    this.logger.log(`Payment confirmed: ${payment.id} — Sponsor ${payment.contract.sponsor.name} now ACTIVE`);

    return {
      success: true,
      message: 'Pagamento confirmado e patrocinador ativado',
      sponsorId: payment.contract.sponsorId,
      sponsorName: payment.contract.sponsor.name,
      contractId: payment.contractId,
      activatedAt: new Date(),
      expiresAt: endsAt,
    };
  }

  // ---- GET PAYMENT STATUS ----

  async getPaymentStatus(paymentId: string) {
    const payment = await this.prisma.sponsorPayment.findUnique({
      where: { id: paymentId },
      include: { contract: { select: { contractNumber: true, sponsor: { select: { name: true } } } } },
    });

    if (!payment) throw new NotFoundException('Pagamento não encontrado');

    return {
      id: payment.id,
      status: payment.status,
      amountCents: payment.amountCents,
      amountFormatted: `R$ ${(payment.amountCents / 100).toFixed(2).replace('.', ',')}`,
      tier: payment.tier,
      durationMonths: payment.durationMonths,
      pixCode: payment.pixCode,
      pixExpiresAt: payment.pixExpiresAt,
      pixExpired: payment.pixExpiresAt && payment.pixExpiresAt < new Date(),
      paidAt: payment.paidAt,
      contractNumber: payment.contract.contractNumber,
      sponsorName: payment.contract.sponsor.name,
    };
  }

  // ---- LIST PENDING PAYMENTS (Admin) ----

  async listPendingPayments() {
    const payments = await this.prisma.sponsorPayment.findMany({
      where: { status: 'PENDING' },
      include: { contract: { select: { contractNumber: true, sponsor: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      sponsorName: p.contract.sponsor.name,
      sponsorEmail: p.contract.sponsor.email,
      contractNumber: p.contract.contractNumber,
      tier: p.tier,
      durationMonths: p.durationMonths,
      amountCents: p.amountCents,
      amountFormatted: `R$ ${(p.amountCents / 100).toFixed(2).replace('.', ',')}`,
      pixExpiresAt: p.pixExpiresAt,
      pixExpired: p.pixExpiresAt && p.pixExpiresAt < new Date(),
      createdAt: p.createdAt,
    }));
  }

  // ---- EXPIRE PENDING PAYMENTS (Cron) ----

  async expirePendingPayments() {
    const expired = await this.prisma.sponsorPayment.updateMany({
      where: {
        status: 'PENDING',
        pixExpiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} pending sponsor payments`);
    }

    return { expiredCount: expired.count };
  }

  // ---- EXPIRE ACTIVE CONTRACTS (Cron) ----

  async expireActiveContracts() {
    const now = new Date();

    // Find expired contracts
    const expiredContracts = await this.prisma.sponsorContract.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lt: now },
      },
      select: { id: true, sponsorId: true },
    });

    if (expiredContracts.length === 0) return { expiredCount: 0 };

    const sponsorIds = [...new Set(expiredContracts.map((c) => c.sponsorId))];
    const contractIds = expiredContracts.map((c) => c.id);

    await this.prisma.$transaction(async (tx) => {
      // Mark contracts as expired
      await tx.sponsorContract.updateMany({
        where: { id: { in: contractIds } },
        data: { status: 'EXPIRED' },
      });

      // Deactivate sponsors (only if no other active contract)
      for (const sponsorId of sponsorIds) {
        const activeContract = await tx.sponsorContract.findFirst({
          where: { sponsorId, status: 'ACTIVE' },
        });

        if (!activeContract) {
          await tx.sponsor.update({
            where: { id: sponsorId },
            data: { isActive: false },
          });
        }
      }
    });

    this.logger.log(`Expired ${expiredContracts.length} contracts, deactivated ${sponsorIds.length} sponsors`);

    return { expiredCount: expiredContracts.length, deactivatedSponsors: sponsorIds.length };
  }

  // ---- CONTRACT GENERATION (for admin-created sponsors) ----

  async generateContract(sponsorId: string, durationMonths: number = 6) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    const startsAt = sponsor.contractStartsAt || new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    const contractNumber = `BP-${sponsor.tier.charAt(0)}${sponsor.tier.charAt(1)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const benefits = this.getBenefitsForTier(sponsor.tier);
    const obligations = this.getObligationsForTier(sponsor.tier);

    const contract = await this.prisma.sponsorContract.create({
      data: {
        contractNumber,
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        sponsorEmail: sponsor.email,
        contactPersonName: sponsor.name,
        tier: sponsor.tier,
        sponsorType: sponsor.sponsorType,
        benefits,
        obligations,
        startsAt,
        endsAt,
        durationMonths,
        status: 'ACTIVE',
      },
    });

    // Update sponsor dates
    await this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { contractStartsAt: startsAt, contractEndsAt: endsAt },
    });

    return contract;
  }

  async getContract(contractId: string) {
    const contract = await this.prisma.sponsorContract.findUnique({
      where: { id: contractId },
      include: { sponsor: { select: { id: true, name: true, slug: true, tier: true, logoLightUrl: true } } },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async getContractByNumber(contractNumber: string) {
    const contract = await this.prisma.sponsorContract.findUnique({
      where: { contractNumber },
      include: { sponsor: { select: { id: true, name: true, slug: true, tier: true, logoLightUrl: true } } },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async listContracts(filters?: { status?: string; sponsorId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.sponsorId) where.sponsorId = filters.sponsorId;

    return this.prisma.sponsorContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { sponsor: { select: { name: true, tier: true, logoLightUrl: true } } },
    });
  }

  async cancelContract(contractId: string, reason: string) {
    const contract = await this.prisma.sponsorContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    return this.prisma.sponsorContract.update({
      where: { id: contractId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }

  // ---- TIER DETAILS ----

  // Preços em centavos por tier e período
  private readonly TIER_PRICING: Record<string, Record<number, number>> = {
    DIAMOND: { 3: 119970, 6: 179940, 12: 287880 },  // R$ 1.199,70 | R$ 1.799,40 | R$ 2.878,80
    GOLD:    { 3: 44970,  6: 59940,  12: 107880 },   // R$ 449,70   | R$ 599,40   | R$ 1.078,80
    SILVER:  { 3: 14970,  6: 23940,  12: 41880 },    // R$ 149,70   | R$ 239,40   | R$ 418,80
    BRONZE:  { 3: 5970,   6: 8940,   12: 14880 },    // R$ 59,70    | R$ 89,40    | R$ 148,80
  };

  // PIX da plataforma — lido de SystemSettings (configurado pelo Super Admin)
  private async getSystemPixConfig(): Promise<PixConfig> {
    const [pixKey, pixKeyType, pixHolderName, pixCity] = await Promise.all([
      this.prisma.systemSettings.findUnique({ where: { key: 'payment.pix_key' } }),
      this.prisma.systemSettings.findUnique({ where: { key: 'payment.pix_key_type' } }),
      this.prisma.systemSettings.findUnique({ where: { key: 'payment.pix_holder_name' } }),
      this.prisma.systemSettings.findUnique({ where: { key: 'payment.pix_city' } }),
    ]);

    if (!pixKey?.value) {
      throw new BadRequestException(
        'Configurações de PIX da plataforma não encontradas. Configure em Admin → Billing → PIX.',
      );
    }

    return {
      key: pixKey.value,
      keyType: pixKeyType?.value || 'EMAIL',
      holderName: pixHolderName?.value || 'BELA PRO',
      city: pixCity?.value || 'SAO PAULO',
    };
  }

  getTierDetails() {
    return {
      DIAMOND: {
        name: 'Diamond Partner',
        icon: '💎',
        color: '#a78bfa',
        pricing: {
          3: { price: 119970, priceLabel: 'R$ 1.199,70', perMonth: 'R$ 399,90/mês' },
          6: { price: 179940, priceLabel: 'R$ 1.799,40', perMonth: 'R$ 299,90/mês', discount: '25% de desconto' },
          12: { price: 287880, priceLabel: 'R$ 2.878,80', perMonth: 'R$ 239,90/mês', discount: '40% de desconto', featured: true },
        },
        highlights: ['Painel exclusivo com analytics', 'Gestão própria de postagens e anúncios', 'Logo em todas as páginas da plataforma', 'Relatórios detalhados de performance', 'Destaque prioritário na plataforma', 'Badge "Parceiro Diamond Verificado"', 'Suporte dedicado e prioritário', 'Customização da área de parceiro'],
        placement: 'Todas as páginas (landing, booking, dashboard, marketing)',
        maxPosts: 'Ilimitado',
      },
      GOLD: {
        name: 'Gold Partner',
        icon: '🥇',
        color: '#f59e0b',
        pricing: {
          3: { price: 44970, priceLabel: 'R$ 449,70', perMonth: 'R$ 149,90/mês' },
          6: { price: 59940, priceLabel: 'R$ 599,40', perMonth: 'R$ 99,90/mês', discount: '33% de desconto' },
          12: { price: 107880, priceLabel: 'R$ 1.078,80', perMonth: 'R$ 89,90/mês', discount: '40% de desconto', featured: true },
        },
        highlights: ['Logo na página de agendamento', 'Logo na landing page de convites', 'Relatório mensal de impressões e cliques', 'Badge "Parceiro Gold Verificado"', 'Até 5 postagens ativas por mês', 'Suporte por email'],
        placement: 'Landing de convite + Página de agendamento',
        maxPosts: '5 por mês',
      },
      SILVER: {
        name: 'Silver Partner',
        icon: '🥈',
        color: '#94a3b8',
        pricing: {
          3: { price: 14970, priceLabel: 'R$ 149,70', perMonth: 'R$ 49,90/mês' },
          6: { price: 23940, priceLabel: 'R$ 239,40', perMonth: 'R$ 39,90/mês', discount: '20% de desconto' },
          12: { price: 41880, priceLabel: 'R$ 418,80', perMonth: 'R$ 34,90/mês', discount: '30% de desconto', featured: true },
        },
        highlights: ['Logo na página de agendamento', 'Relatório mensal de impressões', 'Badge "Parceiro Silver"', 'Até 2 postagens ativas por mês'],
        placement: 'Página de agendamento',
        maxPosts: '2 por mês',
      },
      BRONZE: {
        name: 'Bronze Partner',
        icon: '🥉',
        color: '#d97706',
        pricing: {
          3: { price: 5970, priceLabel: 'R$ 59,70', perMonth: 'R$ 19,90/mês' },
          6: { price: 8940, priceLabel: 'R$ 89,40', perMonth: 'R$ 14,90/mês', discount: '25% de desconto' },
          12: { price: 14880, priceLabel: 'R$ 148,80', perMonth: 'R$ 12,40/mês', discount: '38% de desconto', featured: true },
        },
        highlights: ['Logo na página de parceiros', 'Badge "Parceiro Bronze"', 'Relatório trimestral básico'],
        placement: 'Página de parceiros',
        maxPosts: 'Não incluído',
      },
    };
  }

  // ---- HELPERS ----

  private getBenefitsForTier(tier: string): string[] {
    const tierDetails = this.getTierDetails();
    return tierDetails[tier as keyof typeof tierDetails]?.highlights || [];
  }

  private getObligationsForTier(tier: string): string[] {
    const base = [
      'Manter informações de contato atualizadas',
      'Não utilizar a marca Bela Pro sem autorização prévia por escrito',
      'Respeitar os termos de uso da plataforma',
      'Não veicular conteúdo ofensivo, discriminatório ou ilegal',
    ];
    if (tier === 'DIAMOND' || tier === 'GOLD') {
      base.push('Fornecer materiais de marca (logo em alta resolução) em até 7 dias úteis');
      base.push('Manter conteúdo de postagens em conformidade com as diretrizes da plataforma');
    }
    return base;
  }

  // ---- CRON ----

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldInvites() {
    const result = await this.prisma.sponsorInvite.updateMany({
      where: { status: { in: ['PENDING', 'VIEWED', 'CLICKED_CTA'] }, expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) this.logger.log(`Expirados ${result.count} convites de patrocinador`);
  }
}
