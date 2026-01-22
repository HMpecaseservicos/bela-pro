'use client';

import { useState, useEffect, useCallback } from 'react';
import { Workspace, Service, TimeSlot, BookingStep, BookingState, ThemeConfig } from '../types';
import { API_URL, DEFAULT_COPY, getThemeFromWorkspace } from '../constants';
import { cleanPhone } from '../utils';

interface UseBookingProps {
  slug: string;
}

interface UseBookingReturn extends BookingState {
  // Actions
  fetchWorkspace: () => Promise<void>;
  selectService: (service: Service) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  selectSlot: (slot: string) => void;
  setClientName: (name: string) => void;
  setClientPhone: (phone: string) => void;
  confirmBooking: () => Promise<void>;
  goBack: () => void;
  goToStep: (step: BookingStep) => void;
  clearError: () => void;
  resetBooking: () => void;
  
  // Computed
  canProceed: boolean;
  primaryColor: string;
  gradientBg: string;
  theme: ThemeConfig;
}

const initialState: BookingState = {
  workspace: null,
  services: [],
  availableDays: [],
  availableSlots: [],
  selectedService: null,
  selectedDate: null,
  selectedSlot: null,
  clientName: '',
  clientPhone: '',
  step: 1,
  loading: true,
  error: null,
  success: false,
};

export function useBooking({ slug }: UseBookingProps): UseBookingReturn {
  const [state, setState] = useState<BookingState>(initialState);

  // Computed values
  const theme = getThemeFromWorkspace(state.workspace);
  const primaryColor = theme.colors.primary;
  const gradientBg = theme.colors.gradient;

  // Determina se pode prosseguir baseado na etapa atual
  const canProceed = (() => {
    switch (state.step) {
      case 1:
        return state.selectedService !== null;
      case 2:
        return state.selectedDate !== null;
      case 3:
        return state.selectedSlot !== null;
      case 4:
        return state.clientName.trim().length >= 3 && state.clientPhone.replace(/\D/g, '').length >= 10;
      default:
        return false;
    }
  })();

  // Fetch workspace e serviços
  const fetchWorkspace = useCallback(async () => {
    if (!slug) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const res = await fetch(`${API_URL}/workspace/by-slug/${slug}`);
      if (!res.ok) throw new Error(DEFAULT_COPY.notFound);
      
      const workspace: Workspace = await res.json();
      
      const servicesRes = await fetch(`${API_URL}/workspace/${workspace.id}/services`);
      const services: Service[] = await servicesRes.json();
      
      // Ordenar serviços por sortOrder
      const sortedServices = services
        .filter(s => s.showInBooking !== false)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setState(prev => ({
        ...prev,
        workspace,
        services: sortedServices,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || DEFAULT_COPY.notFound,
      }));
    }
  }, [slug]);

  // Selecionar serviço e buscar dias disponíveis
  const selectService = useCallback(async (service: Service) => {
    if (!state.workspace) return;
    
    setState(prev => ({
      ...prev,
      selectedService: service,
      loading: true,
      error: null,
    }));
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `${API_URL}/availability/days?workspaceId=${state.workspace.id}&serviceId=${service.id}&from=${today}&limit=14`
      );
      
      const days: string[] = await res.json();
      
      setState(prev => ({
        ...prev,
        availableDays: days,
        step: 2,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: DEFAULT_COPY.genericError,
      }));
    }
  }, [state.workspace]);

  // Selecionar data e buscar horários
  const selectDate = useCallback(async (date: string) => {
    if (!state.workspace || !state.selectedService) return;
    
    setState(prev => ({
      ...prev,
      selectedDate: date,
      loading: true,
      error: null,
    }));
    
    try {
      const res = await fetch(
        `${API_URL}/availability/slots?workspaceId=${state.workspace.id}&serviceId=${state.selectedService.id}&date=${date}`
      );
      
      const slots: TimeSlot[] = await res.json();
      const availableSlots = slots.filter(s => s.available);
      
      setState(prev => ({
        ...prev,
        availableSlots,
        step: 3,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: DEFAULT_COPY.genericError,
      }));
    }
  }, [state.workspace, state.selectedService]);

  // Selecionar horário
  const selectSlot = useCallback((slot: string) => {
    setState(prev => ({
      ...prev,
      selectedSlot: slot,
      step: 4,
    }));
  }, []);

  // Set client name
  const setClientName = useCallback((name: string) => {
    setState(prev => ({ ...prev, clientName: name }));
  }, []);

  // Set client phone
  const setClientPhone = useCallback((phone: string) => {
    setState(prev => ({ ...prev, clientPhone: phone }));
  }, []);

  // Confirmar agendamento
  const confirmBooking = useCallback(async () => {
    if (!state.workspace || !state.selectedService || !state.selectedSlot) return;
    
    const trimmedName = state.clientName.trim();
    const cleanedPhone = cleanPhone(state.clientPhone);
    
    if (trimmedName.length < 3 || cleanedPhone.length < 10) {
      setState(prev => ({ ...prev, error: DEFAULT_COPY.requiredFields }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const res = await fetch(`${API_URL}/public-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: state.workspace!.id,
          serviceId: state.selectedService!.id,
          startAt: state.selectedSlot,
          clientName: trimmedName,
          clientPhone: cleanedPhone,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || DEFAULT_COPY.genericError);
      }
      
      setState(prev => ({
        ...prev,
        success: true,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || DEFAULT_COPY.genericError,
      }));
    }
  }, [state.workspace, state.selectedService, state.selectedSlot, state.clientName, state.clientPhone]);

  // Voltar uma etapa
  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 1) return prev;
      
      const newStep = (prev.step - 1) as BookingStep;
      
      // Limpar seleções ao voltar
      const updates: Partial<BookingState> = { step: newStep, error: null };
      
      if (newStep < 2) {
        updates.selectedService = null;
        updates.availableDays = [];
      }
      if (newStep < 3) {
        updates.selectedDate = null;
        updates.availableSlots = [];
      }
      if (newStep < 4) {
        updates.selectedSlot = null;
      }
      
      return { ...prev, ...updates };
    });
  }, []);

  // Ir para etapa específica (apenas para etapas já completadas)
  const goToStep = useCallback((step: BookingStep) => {
    setState(prev => {
      // Só permite ir para etapas anteriores ou a atual
      if (step > prev.step) return prev;
      return { ...prev, step, error: null };
    });
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Resetar booking (para fazer novo agendamento)
  const resetBooking = useCallback(() => {
    setState(prev => ({
      ...initialState,
      workspace: prev.workspace,
      services: prev.services,
      loading: false,
    }));
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  return {
    ...state,
    fetchWorkspace,
    selectService,
    selectDate,
    selectSlot,
    setClientName,
    setClientPhone,
    confirmBooking,
    goBack,
    goToStep,
    clearError,
    resetBooking,
    canProceed,
    primaryColor,
    gradientBg,
    theme,
  };
}

// Função helper inline para evitar importar do utils no mesmo arquivo
function adjustColorSimple(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
