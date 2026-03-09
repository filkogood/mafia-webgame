import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const reporterRole: RoleDefinition = {
  role: Role.REPORTER,
  team: 'citizen',
  koreanName: '기자',
  canNightAct: true,
  nightActDescription: '밤마다 한 명을 취재하여 사망 시 역할을 공개할 수 있습니다.',
};
