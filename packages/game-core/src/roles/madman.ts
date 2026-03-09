import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const madmanRole: RoleDefinition = {
  role: Role.MADMAN,
  team: 'citizen',
  koreanName: '미치광이',
  canNightAct: false,
  nightActDescription: '경찰이 조사하면 마피아로 표시됩니다.',
};
