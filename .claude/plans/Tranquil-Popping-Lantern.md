# Chat Audio Feature Implementation Plan

## Goal
Build a new `ChatAudio` module for the NestJS API that tracks audio-related chat usage metrics and billing events, following the same patterns as the existing `ChatUsage` module.

## Architecture
The new module will follow the exact same structure as `ChatUsageModule`:
- `ChatAudioModule` - NestJS module registering controllers, services, and imports
- `ChatAudioController` - REST endpoints for audio usage data
- `ChatAudioService` - Business logic for audio usage tracking and billing
- `ChatAudioTypes` - TypeScript types/interfaces for audio usage data

## Key Design Decisions
- **Follow existing patterns**: Mirror the `ChatUsage` module structure exactly (module, controller, service, types)
- **Reuse PrismaModule**: Use the existing Prisma ORM setup for database access
- **JWT Auth Guard**: Protect endpoints with existing `JwtAuthGuard`
- **Workspace-scoped**: All audio usage is scoped to a workspace, same as chat usage

## Implementation Steps

### Step 1: Create ChatAudio types file
Create `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.types.ts` with TypeScript interfaces for:
- Audio usage data (minutes used, minutes limit, billing events)
- Monthly audio usage history
- Audio billing summary

### Step 2: Create ChatAudio service
Create `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.service.ts` with methods for:
- `getOrCreateMonthlyUsage(workspaceId)` - Get or initialize monthly audio usage record
- `getUsageHistory(workspaceId, months)` - Get historical audio usage data
- `getMonthlyBillingSummary(workspaceId, yearMonth)` - Detailed billing summary for a month
- `getConversationBillingEvents(conversationId)` - Audio billing events for a specific conversation

### Step 3: Create ChatAudio controller
Create `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.controller.ts` with REST endpoints:
- `GET /api/v1/chat-audio/:workspaceId/current` - Current month's audio usage
- `GET /api/v1/chat-audio/:workspaceId/history` - Historical audio usage (with optional months query param)
- `GET /api/v1/chat-audio/:workspaceId/summary` - Billing summary (with optional yearMonth query param)
- `GET /api/v1/chat-audio/:workspaceId/conversation/:conversationId/events` - Conversation-specific billing events

### Step 4: Create ChatAudio module
Create `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.module.ts` registering:
- Import: PrismaModule
- Controller: ChatAudioController
- Provider: ChatAudioService
- Export: ChatAudioService

### Step 5: Create index file
Create `/vercel/sandbox/apps/api/src/chat-audio/index.ts` re-exporting the module

### Step 6: Register in AppModule
Add `ChatAudioModule` import to `/vercel/sandbox/apps/api/src/app.module.ts`

### Step 7: Verify build
Run the build to ensure no TypeScript errors

## Files to Create
1. `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.types.ts`
2. `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.service.ts`
3. `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.controller.ts`
4. `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.module.ts`
5. `/vercel/sandbox/apps/api/src/chat-audio/index.ts`

## Files to Modify
1. `/vercel/sandbox/apps/api/src/app.module.ts` - Add ChatAudioModule import

## Reference Files
- `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.module.ts` (ChatUsage pattern)
- `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.controller.ts` (Controller pattern)
- `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.service.ts` (Service pattern)
- `/vercel/sandbox/apps/api/src/chat-audio/chat-audio.types.ts` (Types pattern)
