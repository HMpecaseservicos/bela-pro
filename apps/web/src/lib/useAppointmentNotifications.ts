'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getApiBaseUrl } from '@/lib/utils';

interface Appointment {
  id: string;
  createdAt: string;
  client: {
    name: string;
    phoneE164: string;
  };
  services: Array<{
    service: {
      name: string;
    };
  }>;
  startAt: string;
  status: string;
}

/**
 * Gera um som de notificação profissional usando Web Audio API
 * Dois tons suaves tipo "ding dong" 
 */
function createNotificationSound(): () => void {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Primeiro tom (mais alto)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 830; // Nota mais alta
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.3);
      
      // Segundo tom (mais baixo, após 0.15s)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 660; // Nota mais baixa
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0, audioContext.currentTime);
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.5);
      
      // Cleanup
      setTimeout(() => audioContext.close(), 1000);
    } catch (e) {
      console.warn('Erro ao tocar som:', e);
    }
  };
}

/**
 * Hook para notificações push de novos agendamentos
 * - Pede permissão do navegador
 * - Faz polling a cada 30 segundos
 * - Mostra notificação nativa + som quando há novo agendamento
 */
export function useAppointmentNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const lastCheckRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playSoundRef = useRef<() => void>(() => {});

  // Inicializa função de som
  useEffect(() => {
    if (typeof window !== 'undefined') {
      playSoundRef.current = createNotificationSound();
    }
  }, []);

  // Verifica permissão
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Solicitar permissão
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Navegador não suporta notificações');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      setEnabled(true);
      return true;
    }
    
    return false;
  }, []);

  // Tocar som
  const playSound = useCallback(() => {
    playSoundRef.current();
  }, []);

  // Mostrar notificação
  const showNotification = useCallback((appointment: Appointment) => {
    if (permission !== 'granted') return;

    const serviceName = appointment.services
      .map(s => s.service?.name)
      .filter(Boolean)
      .join(', ') || 'Serviço';

    const startDate = new Date(appointment.startAt);
    const dateStr = startDate.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    const timeStr = startDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Notificação nativa
    new Notification('📅 Novo Agendamento!', {
      body: `${appointment.client.name}\n${serviceName}\n${dateStr} às ${timeStr}`,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: `appointment-${appointment.id}`, // Evita duplicatas
      requireInteraction: true,
    });

    // Tocar som
    playSound();
  }, [permission, playSound]);

  // Verificar novos agendamentos
  const checkNewAppointments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${getApiBaseUrl()}/api/v1/appointments/recent?minutes=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const appointments: Appointment[] = await res.json();

      // Filtrar agendamentos que ainda não foram notificados
      const newAppointments = appointments.filter(
        apt => !lastCheckRef.current.includes(apt.id)
      );

      // Notificar cada novo agendamento
      for (const apt of newAppointments) {
        showNotification(apt);
      }

      // Atualizar lista de IDs já notificados (manter últimos 50)
      lastCheckRef.current = [
        ...appointments.map(a => a.id),
        ...lastCheckRef.current,
      ].slice(0, 50);

    } catch (error) {
      // Silently ignore errors
    }
  }, [showNotification]);

  // Iniciar polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    
    // Primeira verificação imediata
    checkNewAppointments();
    
    // Depois a cada 30 segundos
    intervalRef.current = setInterval(checkNewAppointments, 30000);
    setEnabled(true);
  }, [checkNewAppointments]);

  // Parar polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setEnabled(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start se já tem permissão
  useEffect(() => {
    if (permission === 'granted' && !enabled) {
      startPolling();
    }
  }, [permission, enabled, startPolling]);

  return {
    permission,
    enabled,
    requestPermission,
    startPolling,
    stopPolling,
    playSound, // Para testar som manualmente
  };
}
