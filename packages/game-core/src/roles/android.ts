import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const androidRole: RoleDefinition = {
  role: Role.ANDROID,
  team: 'citizen',
  koreanName: '안드로이드',
  canNightAct: false,
  nightActDescription: '경찰이 조사하면 무고한 시민으로 표시됩니다.',
};
