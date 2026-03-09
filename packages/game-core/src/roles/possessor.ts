import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const possessorRole: RoleDefinition = {
  role: Role.POSSESSOR,
  team: 'citizen',
  koreanName: '빙의자',
  canNightAct: true,
  nightActDescription: '밤마다 한 명에게 빙의하여 그 역할로 활동합니다.',
};
