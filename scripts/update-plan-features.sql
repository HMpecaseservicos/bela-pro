-- Atualizar features dos planos para remover duplicatas
-- Gratuito: apenas features básicas
UPDATE "SubscriptionPlan" SET "features" = ARRAY['Agenda básica', 'Página de agendamento', 'App mobile'] WHERE "slug" = 'gratuito';

-- Profissional: apenas diferenciais (sem repetir o que já tem flag)
UPDATE "SubscriptionPlan" SET "features" = ARRAY['Sem anúncios globais', 'Lembretes automáticos', 'Até 2 patrocinadores próprios'] WHERE "slug" = 'profissional';

-- Business: apenas diferenciais únicos
UPDATE "SubscriptionPlan" SET "features" = ARRAY['Patrocinadores ilimitados', 'Relatórios avançados', 'Suporte prioritário', 'Multi-agenda'] WHERE "slug" = 'business';

-- Enterprise: apenas diferenciais exclusivos
UPDATE "SubscriptionPlan" SET "features" = ARRAY['API personalizada', 'Integrações customizadas', 'Gerente de conta dedicado', 'SLA garantido', 'White-label opcional', 'Multi-unidades'] WHERE "slug" = 'enterprise';
