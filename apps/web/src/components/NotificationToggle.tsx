'use client';

import { useAppointmentNotifications } from '@/lib/useAppointmentNotifications';
import { Bell, BellOff, BellRing, Volume2 } from 'lucide-react';

/**
 * Componente para ativar/desativar notificações de agendamento
 * Exibe no header do dashboard
 */
export function NotificationToggle() {
  const { permission, enabled, requestPermission, startPolling, stopPolling, playSound } = useAppointmentNotifications();

  const handleClick = async () => {
    if (permission === 'default') {
      const granted = await requestPermission();
      if (granted) {
        startPolling();
      }
    } else if (permission === 'granted') {
      if (enabled) {
        stopPolling();
      } else {
        startPolling();
      }
    }
  };

  const handleTestSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSound();
  };

  // Permissão negada
  if (permission === 'denied') {
    return (
      <button
        className="p-2 text-gray-400 cursor-not-allowed"
        title="Notificações bloqueadas. Altere nas configurações do navegador."
        disabled
      >
        <BellOff className="w-5 h-5" />
      </button>
    );
  }

  // Permissão não solicitada
  if (permission === 'default') {
    return (
      <button
        onClick={handleClick}
        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
        title="Ativar notificações de novos agendamentos"
      >
        <Bell className="w-5 h-5" />
      </button>
    );
  }

  // Notificações ativas ou inativas
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-colors ${
          enabled 
            ? 'text-primary-600 bg-primary-50 hover:bg-primary-100' 
            : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
        }`}
        title={enabled ? 'Notificações ativas (clique para desativar)' : 'Ativar notificações'}
      >
        {enabled ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </button>
      {enabled && (
        <button
          onClick={handleTestSound}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
          title="Testar som"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
