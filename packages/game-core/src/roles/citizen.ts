import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const citizenRole: RoleDefinition = {
  role: Role.CITIZEN,
  team: 'citizen',
  koreanName: '시민',
  canNightAct: false,
};
