import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const coupleRole: RoleDefinition = {
  role: Role.COUPLE,
  team: 'citizen',
  koreanName: '커플',
  canNightAct: false,
  nightActDescription:
    '2인 1조. 한 명이 공격받으면 상대방이 대신 사망합니다. 마담에게 취하면 커플 관계가 해제됩니다.',
};
