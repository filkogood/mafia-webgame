import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const cultMonkRole: RoleDefinition = {
  role: Role.CULT_MONK,
  team: 'mafia_collaborator',
  koreanName: '사이비스님',
  canNightAct: true,
  nightActDescription: '대상을 포교하여 마피아 편으로 만듭니다.',
};
