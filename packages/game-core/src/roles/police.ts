import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const policeRole: RoleDefinition = {
  role: Role.POLICE,
  team: 'citizen',
  koreanName: '경찰',
  canNightAct: true,
  nightActDescription: '밤마다 한 명을 조사하여 마피아 여부를 확인합니다.',
};
