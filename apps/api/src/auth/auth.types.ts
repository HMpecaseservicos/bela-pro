export type JwtSubject = {
  userId: string;
  workspaceId: string | null; // null quando super admin acessa sem contexto de workspace
  role: 'OWNER' | 'STAFF' | null;
  isSuperAdmin: boolean;
};
