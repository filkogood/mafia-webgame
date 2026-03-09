import { Role } from '@mafia/shared';
import { RoleDefinition } from './index';

export const terminalPatientRole: RoleDefinition = {
  role: Role.TERMINAL_PATIENT,
  team: 'citizen',
  koreanName: '시한부환자',
  canNightAct: false,
  nightActDescription: '특정 라운드 이후 자동으로 사망합니다.',
};
