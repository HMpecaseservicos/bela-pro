export type JwtSubject = {
  userId: string;
  workspaceId: string;
  role: 'OWNER' | 'STAFF';
};
