import { Test, TestingModule } from '@nestjs/testing';
import { PublicBookingService } from './public-booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('PublicBookingService', () => {
  let service: PublicBookingService;
  let prisma: any;

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Salão Teste',
    slug: 'salao-teste',
    requirePayment: false,
    paymentType: 'NONE',
  };

  const VALID_CUID = 'clxxxxxxxxxxxxxxxxxxxxxxxxx';

  const mockService = {
    id: VALID_CUID,
    workspaceId: 'ws-1',
    name: 'Corte Feminino',
    durationMinutes: 60,
    priceCents: 8000,
    isActive: true,
  };

  const mockClient = {
    id: 'cli-1',
    workspaceId: 'ws-1',
    name: 'Maria',
    phoneE164: '+5511999999999',
    status: 'NORMAL',
  };

  const mockAppointment = {
    id: 'apt-1',
    workspaceId: 'ws-1',
    clientId: 'cli-1',
    startAt: new Date('2026-04-01T10:00:00Z'),
    endAt: new Date('2026-04-01T11:00:00Z'),
    status: 'PENDING',
    client: mockClient,
    services: [{ service: mockService, durationMinutes: 60, priceCents: 8000 }],
  };

  const createMockPrisma = () => ({
    workspace: { findUnique: jest.fn() },
    service: { findMany: jest.fn() },
    appointment: { findMany: jest.fn(), create: jest.fn() },
    client: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  });

  beforeEach(async () => {
    const mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicBookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: { createPaymentForAppointment: jest.fn() } },
      ],
    }).compile();

    service = module.get<PublicBookingService>(PublicBookingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createBooking — validação Zod', () => {
    it('deve rejeitar input sem campos obrigatórios', async () => {
      await expect(service.createBooking({})).rejects.toThrow();
    });

    it('deve rejeitar clientName muito curto', async () => {
      await expect(
        service.createBooking({
          workspaceId: 'ws-1',
          clientName: 'A',
          clientPhone: '11999999999',
          serviceIds: [VALID_CUID],
          startAt: '2026-04-01T10:00:00Z',
        }),
      ).rejects.toThrow();
    });

    it('deve rejeitar lista vazia de serviços', async () => {
      await expect(
        service.createBooking({
          workspaceId: 'ws-1',
          clientName: 'Maria',
          clientPhone: '11999999999',
          serviceIds: [],
          startAt: '2026-04-01T10:00:00Z',
        }),
      ).rejects.toThrow();
    });
  });

  describe('createBooking — lógica de negócio', () => {
    const validInput = {
      workspaceId: 'ws-1',
      clientName: 'Maria Silva',
      clientPhone: '11999999999',
      serviceIds: [VALID_CUID],
      startAt: '2026-04-01T10:00:00.000Z',
    };

    it('deve rejeitar workspace inexistente', async () => {
      prisma.workspace.findUnique.mockResolvedValue(null);
      await expect(service.createBooking(validInput)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar serviço de outro workspace (tenant isolation)', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.service.findMany.mockResolvedValue([]); // nenhum serviço encontrado com workspaceId+serviceId
      await expect(service.createBooking(validInput)).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar horário com conflito', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.appointment.findMany.mockResolvedValue([{ id: 'existing-apt' }]); // conflito
      await expect(service.createBooking(validInput)).rejects.toThrow(ConflictException);
    });

    it('deve criar agendamento com sucesso sem pagamento', async () => {
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.appointment.findMany.mockResolvedValue([]); // sem conflitos
      prisma.client.findUnique.mockResolvedValue(null); // cliente novo
      prisma.client.create.mockResolvedValue(mockClient);
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.createBooking(validInput);
      expect(result.id).toBe('apt-1');
      expect(result.requiresPayment).toBe(false);
      expect(result.paymentInfo).toBeNull();
    });

    it('deve criar agendamento com pagamento quando workspace exige', async () => {
      const paidWorkspace = { ...mockWorkspace, requirePayment: true, paymentType: 'FULL' };
      prisma.workspace.findUnique.mockResolvedValue(paidWorkspace);
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.client.findUnique.mockResolvedValue(null);
      prisma.client.create.mockResolvedValue(mockClient);
      prisma.appointment.create.mockResolvedValue({ ...mockAppointment, status: 'PENDING_PAYMENT' });

      // PaymentsService mock already returns undefined for createPaymentForAppointment
      const result = await service.createBooking(validInput);
      expect(result.requiresPayment).toBe(true);
    });

    it('deve reutilizar cliente existente pelo telefone', async () => {
      const existingClient = { ...mockClient, name: 'Maria Silva' };
      prisma.workspace.findUnique.mockResolvedValue(mockWorkspace);
      prisma.service.findMany.mockResolvedValue([mockService]);
      prisma.appointment.findMany.mockResolvedValue([]);
      prisma.client.findUnique.mockResolvedValue(existingClient); // já existe com mesmo nome
      prisma.appointment.create.mockResolvedValue(mockAppointment);

      await service.createBooking(validInput);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });
  });
});
