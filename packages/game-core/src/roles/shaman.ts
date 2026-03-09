import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const shamanRole: RoleDefinition = {
  role: Role.SHAMAN,
  team: 'citizen',
  koreanName: '무당',
  canNightAct: true,
  nightActDescription: '밤마다 사망한 플레이어의 역할을 확인합니다.',
};
