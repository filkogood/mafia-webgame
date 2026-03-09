import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const rookieMafiaRole: RoleDefinition = {
  role: Role.ROOKIE_MAFIA,
  team: 'mafia_collaborator',
  koreanName: '신입마피아',
  canNightAct: false,
  nightActDescription:
    '마피아 본체가 모두 사망하면 마피아 본체 역할을 계승합니다.',
};
