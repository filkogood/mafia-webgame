import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const burglarRole: RoleDefinition = {
  role: Role.BURGLAR,
  team: 'mafia_collaborator',
  koreanName: '빈집털이범',
  canNightAct: true,
  nightActDescription: '대상이 다음 투표1, 투표2에서 투표할 수 없게 합니다.',
};
