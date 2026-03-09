import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const madamRole: RoleDefinition = {
  role: Role.MADAM,
  team: 'mafia_collaborator',
  koreanName: '마담',
  canNightAct: true,
  nightActDescription:
    '대상을 취하게 만들어 정치인 능력을 제거하거나 커플 관계를 깨뜨립니다.',
};
