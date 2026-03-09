import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const hackerRole: RoleDefinition = {
  role: Role.HACKER,
  team: 'mafia_collaborator',
  koreanName: '해커',
  canNightAct: true,
  nightActDescription: '밤마다 한 명을 해킹하여 대상 정보를 수집합니다.',
};
