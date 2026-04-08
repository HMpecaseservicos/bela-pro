'use client';

import { useState, useEffect, useCallback } from 'react';
import { Workspace, Service, ServiceCategory, TimeSlot, BookingStep, BookingState, ThemeConfig, PaymentInfo, CartItem } from '../types';
import { API_URL, DEFAULT_COPY, getThemeFromWorkspace } from '../constants';
import { cleanPhone } from '../utils';

interface UseBookingProps {
  slug: string;
}

interface UseBookingReturn extends BookingState {
  // Actions
  fetchWorkspace: () => Promise<void>;
  toggleService: (service: Service) => void;
  proceedToDateSelection: () => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  selectSlot: (slot: string) => void;
  setClientName: (name: string) => void;
  setClientPhone: (phone: string) => void;
  setDeliveryMethod: (method: 'PICKUP' | 'DELIVERY') => void;
  confirmBooking: () => Promise<void>;
  goBack: () => void;
  goToStep: (step: BookingStep) => void;
  clearError: () => void;
  resetBooking: () => void;
  
  // LOJA UNIFICADA: Actions
  addToCart: (service: Service) => void;
  removeFromCart: (serviceId: string) => void;
  updateCartQuantity: (serviceId: string, quantity: number) => void;
  setItemFilter: (filter: 'all' | 'service' | 'product') => void;
  
  // Computed
  canProceed: boolean;
  primaryColor: string;
  gradientBg: string;
  theme: ThemeConfig;
  totalDuration: number;
  totalPrice: number;
  // LOJA UNIFICADA: Computed
  shopEnabled: boolean;
  businessMode: 'BOOKING' | 'SHOP' | 'HYBRID';
  hasServices: boolean;
  hasProducts: boolean;
  totalCartPrice: number;
  totalCombinedPrice: number;
  cartItemCount: number;
}

const initialState: BookingState = {
  workspace: null,
  services: [],
  categories: [],
  availableDays: [],
  availableSlots: [],
  selectedServices: [],
  selectedDate: null,
  selectedSlot: null,
  cart: [], // LOJA UNIFICADA
  clientName: '',
  clientPhone: '',
  deliveryMethod: null, // ENTREGA
  step: 1,
  loading: true,
  error: null,
  success: false,
  paymentInfo: null,
  orderResult: null, // LOJA UNIFICADA
  itemFilter: 'all', // LOJA UNIFICADA
};

export function useBooking({ slug }: UseBookingProps): UseBookingReturn {
  const [state, setState] = useState<BookingState>(initialState);

  // Computed values
  const theme = getThemeFromWorkspace(state.workspace);
  const primaryColor = theme.colors.primary;
  const gradientBg = theme.colors.gradient;
  
  // Totais calculados para múltiplos serviços
  const totalDuration = state.selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = state.selectedServices.reduce((sum, s) => sum + s.priceCents, 0);

  // LOJA UNIFICADA: computed values
  const businessMode = (state.workspace?.businessMode as 'BOOKING' | 'SHOP' | 'HYBRID') || 'BOOKING';
  const shopEnabled = businessMode !== 'BOOKING';
  const hasServices = state.selectedServices.length > 0;
  const hasProducts = state.cart.length > 0;
  const totalCartPrice = state.cart.reduce((sum, item) => sum + item.service.priceCents * item.quantity, 0);
  const totalCombinedPrice = totalPrice + totalCartPrice;
  const cartItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Determina se pode prosseguir baseado na etapa atual
  const canProceed = (() => {
    switch (state.step) {
      case 1:
        return state.selectedServices.length > 0 || state.cart.length > 0; // LOJA UNIFICADA: serviços OU produtos
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
      
      // Fetch serviços e categorias em paralelo
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(`${API_URL}/workspace/${workspace.id}/services`),
        fetch(`${API_URL}/workspace/${workspace.id}/categories`),
      ]);
      
      const services: Service[] = await servicesRes.json();
      const categories: ServiceCategory[] = await categoriesRes.json();
      
      // Ordenar serviços por categoria e sortOrder
      const sortedServices = services
        .filter(s => s.showInBooking !== false)
        .sort((a, b) => {
          // Primeiro por categoria sortOrder
          const catSortA = a.category?.sortOrder ?? 999;
          const catSortB = b.category?.sortOrder ?? 999;
          if (catSortA !== catSortB) return catSortA - catSortB;
          // Depois por sortOrder do serviço
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
      
      setState(prev => ({
        ...prev,
        workspace,
        services: sortedServices,
        categories,
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

  // Toggle seleção de serviço (adiciona ou remove da lista)
  const toggleService = useCallback((service: Service) => {
    setState(prev => {
      const isSelected = prev.selectedServices.some(s => s.id === service.id);
      if (isSelected) {
        return { ...prev, selectedServices: prev.selectedServices.filter(s => s.id !== service.id) };
      } else {
        // Limite de 10 serviços por vez
        if (prev.selectedServices.length >= 10) return prev;
        return { ...prev, selectedServices: [...prev.selectedServices, service] };
      }
    });
  }, []);

  // Prosseguir para seleção de data (após selecionar serviços)
  const proceedToDateSelection = useCallback(async () => {
    // LOJA UNIFICADA: se só tem produtos no carrinho, pular direto para dados
    if (state.selectedServices.length === 0 && state.cart.length > 0) {
      setState(prev => ({ ...prev, step: 4 }));
      return;
    }

    if (!state.workspace || state.selectedServices.length === 0) return;
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));
    
    try {
      // Envia TODOS os serviceIds para calcular disponibilidade com duração total combinada
      const serviceIds = state.selectedServices.map(s => s.id).join(',');
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(
        `${API_URL}/availability/days?workspaceId=${state.workspace.id}&serviceIds=${serviceIds}&from=${today}&limit=14`
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
  }, [state.workspace, state.selectedServices, state.cart]);

  // Selecionar data e buscar horários
  const selectDate = useCallback(async (date: string) => {
    if (!state.workspace || state.selectedServices.length === 0) return;
    
    setState(prev => ({
      ...prev,
      selectedDate: date,
      loading: true,
      error: null,
    }));
    
    try {
      // Envia TODOS os serviceIds para calcular slots com duração total combinada
      const serviceIds = state.selectedServices.map(s => s.id).join(',');
      const res = await fetch(
        `${API_URL}/availability/slots?workspaceId=${state.workspace.id}&serviceIds=${serviceIds}&date=${date}`
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
  }, [state.workspace, state.selectedServices]);

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

  // Set delivery method
  const setDeliveryMethod = useCallback((method: 'PICKUP' | 'DELIVERY') => {
    setState(prev => ({ ...prev, deliveryMethod: method }));
  }, []);

  // Confirmar agendamento
  const confirmBooking = useCallback(async () => {
    if (!state.workspace) return;
    
    const hasServicesSelected = state.selectedServices.length > 0;
    const hasProductsInCart = state.cart.length > 0;
    
    // LOJA UNIFICADA: validação flexível
    if (!hasServicesSelected && !hasProductsInCart) return;
    if (hasServicesSelected && !state.selectedSlot) return;
    
    const trimmedName = state.clientName.trim();
    const cleanedPhone = cleanPhone(state.clientPhone);
    
    if (trimmedName.length < 3 || cleanedPhone.length < 10) {
      setState(prev => ({ ...prev, error: DEFAULT_COPY.requiredFields }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // LOJA UNIFICADA: usar unified-checkout se tem produtos
      if (hasProductsInCart) {
        const res = await fetch(`${API_URL}/public-booking/unified-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: state.workspace!.id,
            serviceIds: state.selectedServices.map(s => s.id),
            startAt: state.selectedSlot || undefined,
            clientName: trimmedName,
            clientPhone: cleanedPhone,
            products: state.cart.map(item => ({
              serviceId: item.service.id,
              quantity: item.quantity,
            })),
            deliveryMethod: state.deliveryMethod || undefined,
          }),
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || DEFAULT_COPY.genericError);
        }
        
        const data = await res.json();
        
        if (data.paymentInfo) {
          setState(prev => ({
            ...prev,
            paymentInfo: data.paymentInfo,
            orderResult: data.order,
            step: 5,
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            success: true,
            orderResult: data.order,
            loading: false,
          }));
        }
      } else {
        // Fluxo original: somente serviços
        const res = await fetch(`${API_URL}/public-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: state.workspace!.id,
            serviceIds: state.selectedServices.map(s => s.id),
            startAt: state.selectedSlot,
            clientName: trimmedName,
            clientPhone: cleanedPhone,
          }),
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || DEFAULT_COPY.genericError);
        }
        
        const data = await res.json();
        
        if (data.paymentInfo) {
          setState(prev => ({
            ...prev,
            paymentInfo: data.paymentInfo,
            step: 5,
            loading: false,
          }));
        } else {
          setState(prev => ({
            ...prev,
            success: true,
            loading: false,
          }));
        }
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || DEFAULT_COPY.genericError,
      }));
    }
  }, [state.workspace, state.selectedServices, state.selectedSlot, state.clientName, state.clientPhone, state.cart, state.deliveryMethod]);

  // LOJA UNIFICADA: Adicionar produto ao carrinho
  const addToCart = useCallback((service: Service) => {
    setState(prev => {
      const existing = prev.cart.find(item => item.service.id === service.id);
      if (existing) {
        // Verificar estoque
        if (service.stock !== null && service.stock !== undefined && existing.quantity >= service.stock) return prev;
        return {
          ...prev,
          cart: prev.cart.map(item =>
            item.service.id === service.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { ...prev, cart: [...prev.cart, { service, quantity: 1 }] };
    });
  }, []);

  // LOJA UNIFICADA: Remover produto do carrinho
  const removeFromCart = useCallback((serviceId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.service.id !== serviceId),
    }));
  }, []);

  // LOJA UNIFICADA: Atualizar quantidade no carrinho
  const updateCartQuantity = useCallback((serviceId: string, quantity: number) => {
    setState(prev => {
      if (quantity <= 0) {
        return { ...prev, cart: prev.cart.filter(item => item.service.id !== serviceId) };
      }
      return {
        ...prev,
        cart: prev.cart.map(item => {
          if (item.service.id !== serviceId) return item;
          // Verificar estoque
          const maxQty = item.service.stock ?? Infinity;
          return { ...item, quantity: Math.min(quantity, maxQty) };
        }),
      };
    });
  }, []);

  // LOJA UNIFICADA: Filtrar itens por tipo
  const setItemFilter = useCallback((filter: 'all' | 'service' | 'product') => {
    setState(prev => ({ ...prev, itemFilter: filter }));
  }, []);

  // Voltar uma etapa
  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 1) return prev;

      // LOJA UNIFICADA: se só tem produtos e está no step 4, voltar para step 1
      if (prev.step === 4 && prev.selectedServices.length === 0 && prev.cart.length > 0) {
        return { ...prev, step: 1 as BookingStep, error: null };
      }
      
      const newStep = (prev.step - 1) as BookingStep;
      
      // Limpar seleções ao voltar — NÃO apaga selectedServices para preservar escolhas do cliente
      const updates: Partial<BookingState> = { step: newStep, error: null };
      
      if (newStep < 2) {
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
      categories: prev.categories,
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
    toggleService,
    proceedToDateSelection,
    selectDate,
    selectSlot,
    setClientName,
    setClientPhone,
    setDeliveryMethod,
    confirmBooking,
    goBack,
    goToStep,
    clearError,
    resetBooking,
    // LOJA UNIFICADA: cart actions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    setItemFilter,
    // Computed
    canProceed,
    primaryColor,
    gradientBg,
    theme,
    totalDuration,
    totalPrice,
    // LOJA UNIFICADA: computed
    shopEnabled,
    businessMode,
    hasServices,
    hasProducts,
    totalCartPrice,
    totalCombinedPrice,
    cartItemCount,
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
