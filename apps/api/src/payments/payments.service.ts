import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

// ==================== SCHEMAS DE VALIDAÇÃO ====================

const paymentSettingsSchema = z.object({
  requirePayment: z.boolean(),
  paymentType: z.enum(['NONE', 'FULL', 'PARTIAL_PERCENT', 'PARTIAL_FIXED']),
  partialPercent: z.number().min(10).max(100).optional().nullable(),
  partialFixedAmount: z.number().min(0).optional().nullable(),
  paymentExpiryMinutes: z.number().min(10).max(1440).default(30), // 10min a 24h
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']).optional().nullable(),
  pixKey: z.string().max(100).optional().nullable(),
  pixHolderName: z.string().max(100).optional().nullable(),
  pixCity: z.string().max(50).optional().nullable(),
});

const confirmPaymentSchema = z.object({
  notes: z.string().max(500).optional(),
});

// ==================== TYPES ====================

export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

// ==================== SERVICE ====================

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CONFIGURAÇÕES ====================

  /**
   * Busca configurações de pagamento do workspace
   */
  async getPaymentSettings(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        requirePayment: true,
        paymentType: true,
        partialPercent: true,
        partialFixedAmount: true,
        paymentExpiryMinutes: true,
        pixKeyType: true,
        pixKey: true,
        pixHolderName: true,
        pixCity: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    return {
      ...workspace,
      partialFixedAmount: workspace.partialFixedAmount 
        ? Number(workspace.partialFixedAmount) 
        : null,
    };
  }

  /**
   * Atualiza configurações de pagamento do workspace
   */
  async updatePaymentSettings(workspaceId: string, input: unknown) {
    const data = paymentSettingsSchema.parse(input);

    // Validações de negócio
    if (data.requirePayment) {
      // Se exige pagamento, precisa ter PIX configurado
      if (!data.pixKey || !data.pixKeyType || !data.pixHolderName) {
        throw new BadRequestException(
          'Para exigir pagamento, configure os dados do PIX (chave, tipo e nome do titular)'
        );
      }

      // Validar tipo de cobrança
      if (data.paymentType === 'PARTIAL_PERCENT') {
        if (!data.partialPercent || data.partialPercent < 10 || data.partialPercent > 100) {
          throw new BadRequestException('Percentual deve ser entre 10% e 100%');
        }
      }

      if (data.paymentType === 'PARTIAL_FIXED') {
        if (!data.partialFixedAmount || data.partialFixedAmount <= 0) {
          throw new BadRequestException('Valor fixo deve ser maior que zero');
        }
      }
    }

    // Atualizar workspace
    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        requirePayment: data.requirePayment,
        paymentType: data.paymentType,
        partialPercent: data.paymentType === 'PARTIAL_PERCENT' ? data.partialPercent : null,
        partialFixedAmount: data.paymentType === 'PARTIAL_FIXED' && data.partialFixedAmount
          ? new Decimal(data.partialFixedAmount)
          : null,
        paymentExpiryMinutes: data.paymentExpiryMinutes,
        pixKeyType: data.pixKeyType,
        pixKey: data.pixKey,
        pixHolderName: data.pixHolderName,
        pixCity: data.pixCity,
      },
      select: {
        requirePayment: true,
        paymentType: true,
        partialPercent: true,
        partialFixedAmount: true,
        paymentExpiryMinutes: true,
        pixKeyType: true,
        pixKey: true,
        pixHolderName: true,
        pixCity: true,
      },
    });

    return {
      ...updated,
      partialFixedAmount: updated.partialFixedAmount 
        ? Number(updated.partialFixedAmount) 
        : null,
    };
  }

  // ==================== CRIAÇÃO DE PAGAMENTO ====================

  /**
   * Calcula o valor do pagamento baseado nas configurações
   */
  calculatePaymentAmount(
    serviceTotalCents: number,
    paymentType: string,
    partialPercent: number | null,
    partialFixedAmountCents: number | null
  ): number {
    switch (paymentType) {
      case 'FULL':
        return serviceTotalCents;
      case 'PARTIAL_PERCENT':
        if (!partialPercent) return serviceTotalCents;
        return Math.round(serviceTotalCents * (partialPercent / 100));
      case 'PARTIAL_FIXED':
        if (!partialFixedAmountCents) return serviceTotalCents;
        // Não pode ser maior que o valor total
        return Math.min(partialFixedAmountCents, serviceTotalCents);
      default:
        return 0;
    }
  }

  /**
   * Gera código PIX "copia e cola" (BR Code estático simplificado)
   * Formato EMV QR Code estático para PIX
   */
  generatePixCode(
    pixKey: string,
    pixKeyType: string,
    holderName: string,
    city: string,
    amountCents: number,
    description?: string
  ): string {
    // Simplificação: retorna dados formatados para o usuário copiar
    // Em produção real, usaria biblioteca de geração de BR Code EMV
    const amount = (amountCents / 100).toFixed(2);
    const txId = `BELA${Date.now().toString(36).toUpperCase()}`;
    
    // Formato simplificado para copy-paste manual
    // Cliente pode usar esses dados em qualquer app de banco
    return JSON.stringify({
      chave: pixKey,
      tipo: pixKeyType,
      nome: holderName,
      cidade: city,
      valor: amount,
      identificador: txId,
    });
  }

  /**
   * Cria um registro de pagamento para um agendamento
   */
  async createPaymentForAppointment(
    appointmentId: string,
    workspaceId: string,
    serviceTotalCents: number
  ) {
    // Buscar configurações do workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        requirePayment: true,
        paymentType: true,
        partialPercent: true,
        partialFixedAmount: true,
        paymentExpiryMinutes: true,
        pixKeyType: true,
        pixKey: true,
        pixHolderName: true,
        pixCity: true,
      },
    });

    if (!workspace || !workspace.requirePayment || workspace.paymentType === 'NONE') {
      return null; // Não requer pagamento
    }

    // Calcular valor
    const partialFixedCents = workspace.partialFixedAmount 
      ? Math.round(Number(workspace.partialFixedAmount) * 100) 
      : null;
    
    const amountCents = this.calculatePaymentAmount(
      serviceTotalCents,
      workspace.paymentType,
      workspace.partialPercent,
      partialFixedCents
    );

    if (amountCents <= 0) {
      return null;
    }

    // Gerar código PIX
    const pixCode = workspace.pixKey && workspace.pixKeyType && workspace.pixHolderName
      ? this.generatePixCode(
          workspace.pixKey,
          workspace.pixKeyType,
          workspace.pixHolderName,
          workspace.pixCity || 'Brasil',
          amountCents,
          'Agendamento BELA PRO'
        )
      : null;

    // Calcular expiração
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (workspace.paymentExpiryMinutes || 30));

    // Criar pagamento
    const payment = await this.prisma.payment.create({
      data: {
        appointmentId,
        amountCents,
        serviceTotalCents,
        status: 'PENDING',
        pixCode,
        expiresAt,
      },
    });

    return {
      ...payment,
      workspace: {
        pixKey: workspace.pixKey,
        pixKeyType: workspace.pixKeyType,
        pixHolderName: workspace.pixHolderName,
        pixCity: workspace.pixCity,
      },
    };
  }

  // ==================== CONFIRMAÇÃO MANUAL ====================

  /**
   * Busca pagamento por ID do agendamento
   */
  async getPaymentByAppointment(appointmentId: string, workspaceId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { 
        appointmentId,
        appointment: { workspaceId },
      },
      include: {
        appointment: {
          select: {
            id: true,
            startAt: true,
            status: true,
            client: { select: { name: true, phoneE164: true } },
            services: {
              include: { service: { select: { name: true } } },
            },
          },
        },
      },
    });

    return payment;
  }

  /**
   * Confirma pagamento manualmente (admin)
   */
  async confirmPayment(
    paymentId: string,
    workspaceId: string,
    userId: string,
    input?: unknown
  ) {
    const data = input ? confirmPaymentSchema.parse(input) : {};

    // Buscar pagamento
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        appointment: { workspaceId },
      },
      include: {
        appointment: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(`Pagamento já está ${payment.status.toLowerCase()}`);
    }

    // Atualizar pagamento e agendamento em transação
    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          confirmedBy: userId,
          notes: data.notes,
        },
      }),
      this.prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    return updatedPayment;
  }

  /**
   * Cancela pagamento (e agendamento)
   */
  async cancelPayment(paymentId: string, workspaceId: string, reason?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        appointment: { workspaceId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Só é possível cancelar pagamentos pendentes');
    }

    // Cancelar pagamento e agendamento
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED', notes: reason },
      }),
      this.prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { 
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: 'SYSTEM',
          cancelReason: reason || 'Pagamento não realizado',
        },
      }),
    ]);

    return { success: true };
  }

  // ==================== EXPIRAÇÃO ====================

  /**
   * Processa pagamentos expirados
   * Chamado via cron ou sob demanda
   */
  async processExpiredPayments(workspaceId?: string) {
    const now = new Date();

    const where = {
      status: 'PENDING' as const,
      expiresAt: { lt: now },
      ...(workspaceId && { appointment: { workspaceId } }),
    };

    const expiredPayments = await this.prisma.payment.findMany({
      where,
      select: { id: true, appointmentId: true },
    });

    if (expiredPayments.length === 0) {
      return { processed: 0 };
    }

    // Cancelar em lote
    await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: { id: { in: expiredPayments.map(p => p.id) } },
        data: { status: 'CANCELLED', notes: 'Expirado automaticamente' },
      }),
      this.prisma.appointment.updateMany({
        where: { id: { in: expiredPayments.map(p => p.appointmentId) } },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledBy: 'SYSTEM',
          cancelReason: 'Pagamento não realizado dentro do prazo',
        },
      }),
    ]);

    return { processed: expiredPayments.length };
  }

  // ==================== LISTAGEM ====================

  /**
   * Lista pagamentos pendentes do workspace (para agenda admin)
   */
  async listPendingPayments(workspaceId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        appointment: { workspaceId },
      },
      include: {
        appointment: {
          select: {
            id: true,
            startAt: true,
            totalPriceCents: true,
            client: { select: { name: true, phoneE164: true } },
            services: {
              include: { service: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return payments;
  }

  /**
   * Busca dados públicos do PIX para exibição ao cliente
   */
  async getPublicPixData(workspaceSlug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: {
        requirePayment: true,
        paymentType: true,
        partialPercent: true,
        partialFixedAmount: true,
        paymentExpiryMinutes: true,
        pixKeyType: true,
        pixKey: true,
        pixHolderName: true,
        pixCity: true,
      },
    });

    if (!workspace || !workspace.requirePayment) {
      return null;
    }

    return {
      requirePayment: workspace.requirePayment,
      paymentType: workspace.paymentType,
      partialPercent: workspace.partialPercent,
      partialFixedAmount: workspace.partialFixedAmount 
        ? Number(workspace.partialFixedAmount) 
        : null,
      paymentExpiryMinutes: workspace.paymentExpiryMinutes,
      // Dados PIX parciais (mascarar chave para segurança)
      pixKeyType: workspace.pixKeyType,
      pixHolderName: workspace.pixHolderName,
      pixCity: workspace.pixCity,
      // Não expor chave completa publicamente
      pixKeyMasked: workspace.pixKey 
        ? this.maskPixKey(workspace.pixKey, workspace.pixKeyType || 'RANDOM')
        : null,
    };
  }

  /**
   * Mascara chave PIX para exibição pública
   */
  private maskPixKey(key: string, type: string): string {
    switch (type) {
      case 'CPF':
        // 123.456.789-00 → 123.***.***-00
        return key.replace(/^(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})$/, '$1.***.**-$4');
      case 'CNPJ':
        // 12.345.678/0001-90 → 12.***.***/****-90
        return key.replace(/^(\d{2})\.?(\d{3})\.?(\d{3})\/?(\d{4})-?(\d{2})$/, '$1.***.***/****-$5');
      case 'EMAIL':
        // email@domain.com → em***@domain.com
        const [user, domain] = key.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
      case 'PHONE':
        // (11)99999-9999 → (11)9****-**99
        return key.replace(/(\d{2})(\d{5})(\d{4})/, '($1)9****-**$3'.substring(0, 2));
      default:
        // Aleatória: mostrar apenas últimos 4
        return `****${key.slice(-4)}`;
    }
  }
}
