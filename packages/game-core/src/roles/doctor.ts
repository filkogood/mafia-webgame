import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const doctorRole: RoleDefinition = {
  role: Role.DOCTOR,
  team: 'citizen',
  koreanName: '의사',
  canNightAct: true,
  nightActDescription: '밤마다 한 명을 치료하여 마피아 공격으로부터 보호합니다.',
};
