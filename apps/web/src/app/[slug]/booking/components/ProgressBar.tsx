'use client';

import { STEPS, COLORS } from '../constants';
import { BookingStep } from '../types';

interface ProgressBarProps {
  currentStep: BookingStep;
  primaryColor?: string;
}

export function ProgressBar({ currentStep, primaryColor = COLORS.primaryFallback }: ProgressBarProps) {
  const progress = (currentStep / STEPS.length) * 100;
  const currentStepConfig = STEPS.find(s => s.number === currentStep);
  
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Label da etapa */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span 
          style={{ 
            fontSize: 14, 
            color: COLORS.textSecondary,
            fontWeight: 500,
          }}
        >
          Etapa {currentStep} de {STEPS.length}
          <span style={{ color: COLORS.textPrimary, fontWeight: 600, marginLeft: 8 }}>
            {currentStepConfig?.label}
          </span>
        </span>
      </div>
      
      {/* Barra de progresso */}
      <div
        style={{
          width: '100%',
          height: 4,
          backgroundColor: COLORS.border,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: primaryColor,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

// Versão alternativa com steps clicáveis (para navegação)
interface ProgressStepsProps {
  currentStep: BookingStep;
  primaryColor?: string;
  onStepClick?: (step: BookingStep) => void;
}

export function ProgressSteps({ 
  currentStep, 
  primaryColor = COLORS.primaryFallback,
  onStepClick 
}: ProgressStepsProps) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      {STEPS.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        const isClickable = isCompleted && onStepClick;
        
        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: isClickable ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  backgroundColor: isCompleted 
                    ? COLORS.success 
                    : isCurrent 
                      ? primaryColor 
                      : COLORS.border,
                  color: isCompleted || isCurrent 
                    ? 'white' 
                    : COLORS.textMuted,
                  boxShadow: isCurrent 
                    ? `0 0 0 4px ${primaryColor}22` 
                    : 'none',
                }}
              >
                {isCompleted ? '✓' : step.number}
              </button>
              
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? primaryColor : COLORS.textMuted,
                }}
              >
                {step.shortLabel}
              </span>
            </div>
            
            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                style={{
                  width: 24,
                  height: 3,
                  backgroundColor: isCompleted ? COLORS.success : COLORS.border,
                  margin: '0 4px',
                  marginBottom: 20, // Offset para alinhar com o círculo
                  borderRadius: 2,
                  transition: 'background-color 0.3s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
