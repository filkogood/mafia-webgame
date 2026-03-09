import { Role, RoleCategory } from '@mafia/shared';

export interface RoleDefinition {
  role: Role;
  team: RoleCategory;
  koreanName: string;
  canNightAct: boolean;
  nightActDescription?: string;
}
