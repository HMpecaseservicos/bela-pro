-- Adicionar status PREPARING ao enum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARING' AFTER 'CONFIRMED';
