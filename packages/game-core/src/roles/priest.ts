import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const priestRole: RoleDefinition = {
  role: Role.PRIEST,
  team: 'citizen',
  koreanName: '사제',
  canNightAct: true,
  nightActDescription: '밤마다 한 명을 축복하여 특수 효과를 부여합니다.',
};
