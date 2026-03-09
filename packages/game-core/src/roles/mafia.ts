import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const mafiaRole: RoleDefinition = {
  role: Role.MAFIA,
  team: 'mafia_body',
  koreanName: '마피아',
  canNightAct: true,
  nightActDescription: '밤마다 시민 한 명을 제거합니다.',
};
