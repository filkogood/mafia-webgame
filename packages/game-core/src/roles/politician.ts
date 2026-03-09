import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const politicianRole: RoleDefinition = {
  role: Role.POLITICIAN,
  team: 'citizen',
  koreanName: '정치인',
  canNightAct: false,
  nightActDescription:
    '투표1·2에서 2표를 행사합니다. 마담에게 취하면 1표로 줄고 투표로 처형 가능해집니다.',
};
