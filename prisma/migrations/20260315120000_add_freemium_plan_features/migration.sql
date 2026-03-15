-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- AlterTable: Add new columns to SubscriptionPlan
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "tier" "PlanTier" DEFAULT 'FREE';
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "maxServices" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "reportsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "remindersEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "hideGlobalSponsors" BOOLEAN DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "localSponsorsEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "localSponsorsLimit" INTEGER DEFAULT 0;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "isFree" BOOLEAN DEFAULT false;

-- Update existing plans to have a slug (generate from name if needed)
UPDATE "SubscriptionPlan" SET "slug" = LOWER(REPLACE("name", ' ', '-')) WHERE "slug" IS NULL;

-- Make slug NOT NULL and UNIQUE
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_slug_key" ON "SubscriptionPlan"("slug");

-- Create indexes
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_tier_idx" ON "SubscriptionPlan"("tier");
CREATE INDEX IF NOT EXISTS "SubscriptionPlan_slug_idx" ON "SubscriptionPlan"("slug");

-- Update default values for chatbot/whatsapp/financial/pix (now false by default for new plans)
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "chatbotEnabled" SET DEFAULT false;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "whatsappEnabled" SET DEFAULT false;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "financialEnabled" SET DEFAULT false;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "pixPaymentEnabled" SET DEFAULT false;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "trialDays" SET DEFAULT 0;

-- =====================================================================
-- INSERT DEFAULT PLANS (Freemium Model)
-- =====================================================================

-- Plan: Gratuito (FREE)
INSERT INTO "SubscriptionPlan" (
  "id", "slug", "name", "description", "tier",
  "priceMonthly", "priceQuarterly", "priceSemiannual", "priceAnnual",
  "maxAppointments", "maxClients", "maxTeamMembers", "maxServices",
  "chatbotEnabled", "whatsappEnabled", "financialEnabled", "pixPaymentEnabled",
  "reportsEnabled", "remindersEnabled",
  "hideGlobalSponsors", "localSponsorsEnabled", "localSponsorsLimit",
  "features", "sortOrder", "isActive", "isHighlighted", "isFree", "trialDays",
  "createdAt", "updatedAt"
) VALUES (
  'plan_free', 'gratuito', 'Gratuito', 'Perfeito para começar. Use grátis para sempre.',
  'FREE',
  0, NULL, NULL, NULL,
  100, 50, 1, 5,
  false, false, false, false,
  false, false,
  false, false, 0,
  ARRAY['Agenda básica', 'Até 50 clientes', 'Até 5 serviços', 'Página de agendamento', 'App mobile'],
  1, true, false, true, 0,
  NOW(), NOW()
) ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "tier" = EXCLUDED."tier",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "maxAppointments" = EXCLUDED."maxAppointments",
  "maxClients" = EXCLUDED."maxClients",
  "maxTeamMembers" = EXCLUDED."maxTeamMembers",
  "maxServices" = EXCLUDED."maxServices",
  "features" = EXCLUDED."features",
  "isFree" = EXCLUDED."isFree",
  "updatedAt" = NOW();

-- Plan: Profissional (PRO)
INSERT INTO "SubscriptionPlan" (
  "id", "slug", "name", "description", "tier",
  "priceMonthly", "priceQuarterly", "priceSemiannual", "priceAnnual",
  "maxAppointments", "maxClients", "maxTeamMembers", "maxServices",
  "chatbotEnabled", "whatsappEnabled", "financialEnabled", "pixPaymentEnabled",
  "reportsEnabled", "remindersEnabled",
  "hideGlobalSponsors", "localSponsorsEnabled", "localSponsorsLimit",
  "features", "sortOrder", "isActive", "isHighlighted", "isFree", "trialDays",
  "createdAt", "updatedAt"
) VALUES (
  'plan_pro', 'profissional', 'Profissional', 'Para profissionais que querem crescer.',
  'PRO',
  4990, 12970, 23940, 39900,
  NULL, NULL, 3, NULL,
  true, true, true, false,
  true, true,
  true, true, 2,
  ARRAY['Tudo do Gratuito', 'Clientes ilimitados', 'Serviços ilimitados', 'Sem anúncios', 'Chatbot WhatsApp', 'Lembretes automáticos', 'Módulo financeiro', 'Até 3 na equipe', 'Até 2 patrocinadores próprios'],
  2, true, true, false, 7,
  NOW(), NOW()
) ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "tier" = EXCLUDED."tier",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "priceQuarterly" = EXCLUDED."priceQuarterly",
  "priceSemiannual" = EXCLUDED."priceSemiannual",
  "priceAnnual" = EXCLUDED."priceAnnual",
  "maxTeamMembers" = EXCLUDED."maxTeamMembers",
  "chatbotEnabled" = EXCLUDED."chatbotEnabled",
  "whatsappEnabled" = EXCLUDED."whatsappEnabled",
  "financialEnabled" = EXCLUDED."financialEnabled",
  "reportsEnabled" = EXCLUDED."reportsEnabled",
  "remindersEnabled" = EXCLUDED."remindersEnabled",
  "hideGlobalSponsors" = EXCLUDED."hideGlobalSponsors",
  "localSponsorsEnabled" = EXCLUDED."localSponsorsEnabled",
  "localSponsorsLimit" = EXCLUDED."localSponsorsLimit",
  "features" = EXCLUDED."features",
  "trialDays" = EXCLUDED."trialDays",
  "isHighlighted" = EXCLUDED."isHighlighted",
  "updatedAt" = NOW();

-- Plan: Business (BUSINESS)
INSERT INTO "SubscriptionPlan" (
  "id", "slug", "name", "description", "tier",
  "priceMonthly", "priceQuarterly", "priceSemiannual", "priceAnnual",
  "maxAppointments", "maxClients", "maxTeamMembers", "maxServices",
  "chatbotEnabled", "whatsappEnabled", "financialEnabled", "pixPaymentEnabled",
  "reportsEnabled", "remindersEnabled",
  "hideGlobalSponsors", "localSponsorsEnabled", "localSponsorsLimit",
  "features", "sortOrder", "isActive", "isHighlighted", "isFree", "trialDays",
  "createdAt", "updatedAt"
) VALUES (
  'plan_business', 'business', 'Business', 'Para salões e clínicas em crescimento.',
  'BUSINESS',
  9990, 25970, 47940, 79900,
  NULL, NULL, NULL, NULL,
  true, true, true, true,
  true, true,
  true, true, 0,
  ARRAY['Tudo do Profissional', 'Equipe ilimitada', 'Pagamento PIX integrado', 'Patrocinadores ilimitados', 'Relatórios avançados', 'Suporte prioritário', 'Multi-agenda'],
  3, true, false, false, 14,
  NOW(), NOW()
) ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "tier" = EXCLUDED."tier",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "priceQuarterly" = EXCLUDED."priceQuarterly",
  "priceSemiannual" = EXCLUDED."priceSemiannual",
  "priceAnnual" = EXCLUDED."priceAnnual",
  "pixPaymentEnabled" = EXCLUDED."pixPaymentEnabled",
  "localSponsorsLimit" = EXCLUDED."localSponsorsLimit",
  "features" = EXCLUDED."features",
  "trialDays" = EXCLUDED."trialDays",
  "updatedAt" = NOW();

-- Plan: Enterprise (ENTERPRISE)
INSERT INTO "SubscriptionPlan" (
  "id", "slug", "name", "description", "tier",
  "priceMonthly", "priceQuarterly", "priceSemiannual", "priceAnnual",
  "maxAppointments", "maxClients", "maxTeamMembers", "maxServices",
  "chatbotEnabled", "whatsappEnabled", "financialEnabled", "pixPaymentEnabled",
  "reportsEnabled", "remindersEnabled",
  "hideGlobalSponsors", "localSponsorsEnabled", "localSponsorsLimit",
  "features", "sortOrder", "isActive", "isHighlighted", "isFree", "trialDays",
  "createdAt", "updatedAt"
) VALUES (
  'plan_enterprise', 'enterprise', 'Enterprise', 'Solução completa para grandes redes.',
  'ENTERPRISE',
  29990, 77970, 143940, 239900,
  NULL, NULL, NULL, NULL,
  true, true, true, true,
  true, true,
  true, true, 0,
  ARRAY['Tudo do Business', 'API personalizada', 'Integrações customizadas', 'Gerente de conta dedicado', 'SLA garantido', 'White-label opcional', 'Multi-unidades'],
  4, true, false, false, 30,
  NOW(), NOW()
) ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "tier" = EXCLUDED."tier",
  "priceMonthly" = EXCLUDED."priceMonthly",
  "priceQuarterly" = EXCLUDED."priceQuarterly",
  "priceSemiannual" = EXCLUDED."priceSemiannual",
  "priceAnnual" = EXCLUDED."priceAnnual",
  "features" = EXCLUDED."features",
  "trialDays" = EXCLUDED."trialDays",
  "updatedAt" = NOW();

-- =====================================================================
-- CREATE PAYMENT INTENT TABLE FOR PIX UPGRADES
-- =====================================================================

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SubscriptionPaymentIntent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "pixCode" TEXT,
    "pixQrCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,

    CONSTRAINT "SubscriptionPaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPaymentIntent_workspaceId_idx" ON "SubscriptionPaymentIntent"("workspaceId");

-- CreateIndex
CREATE INDEX "SubscriptionPaymentIntent_status_expiresAt_idx" ON "SubscriptionPaymentIntent"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentIntent" ADD CONSTRAINT "SubscriptionPaymentIntent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentIntent" ADD CONSTRAINT "SubscriptionPaymentIntent_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
