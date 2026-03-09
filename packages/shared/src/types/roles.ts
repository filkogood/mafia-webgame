export enum Role {
  // Mafia body
  MAFIA = 'MAFIA',
  // Mafia collaborators
  ROOKIE_MAFIA = 'ROOKIE_MAFIA',
  HACKER = 'HACKER',
  MADAM = 'MADAM',
  BURGLAR = 'BURGLAR',
  CULT_MONK = 'CULT_MONK',
  // Citizen basic
  CITIZEN = 'CITIZEN',
  ANDROID = 'ANDROID',
  DOCTOR = 'DOCTOR',
  POLICE = 'POLICE',
  // Citizen special
  COUPLE = 'COUPLE',
  PRIEST = 'PRIEST',
  POSSESSOR = 'POSSESSOR',
  REPORTER = 'REPORTER',
  POLITICIAN = 'POLITICIAN',
  MADMAN = 'MADMAN',
  SHAMAN = 'SHAMAN',
  TERMINAL_PATIENT = 'TERMINAL_PATIENT',
}

export const RoleKoreanName: Record<Role, string> = {
  [Role.MAFIA]: '마피아',
  [Role.ROOKIE_MAFIA]: '신입마피아',
  [Role.HACKER]: '해커',
  [Role.MADAM]: '마담',
  [Role.BURGLAR]: '빈집털이범',
  [Role.CULT_MONK]: '최면술사',
  [Role.CITIZEN]: '시민',
  [Role.ANDROID]: '안드로이드',
  [Role.DOCTOR]: '의사',
  [Role.POLICE]: '경찰',
  [Role.COUPLE]: '커플',
  [Role.PRIEST]: '사제',
  [Role.POSSESSOR]: '빙의자',
  [Role.REPORTER]: '기자',
  [Role.POLITICIAN]: '정치인',
  [Role.MADMAN]: '미치광이',
  [Role.SHAMAN]: '무당',
  [Role.TERMINAL_PATIENT]: '시한부환자',
};

export type RoleCategory = 'mafia_body' | 'mafia_collaborator' | 'citizen';

export const RoleCategory: Record<Role, RoleCategory> = {
  [Role.MAFIA]: 'mafia_body',
  [Role.ROOKIE_MAFIA]: 'mafia_collaborator',
  [Role.HACKER]: 'mafia_collaborator',
  [Role.MADAM]: 'mafia_collaborator',
  [Role.BURGLAR]: 'mafia_collaborator',
  [Role.CULT_MONK]: 'mafia_collaborator',
  [Role.CITIZEN]: 'citizen',
  [Role.ANDROID]: 'citizen',
  [Role.DOCTOR]: 'citizen',
  [Role.POLICE]: 'citizen',
  [Role.COUPLE]: 'citizen',
  [Role.PRIEST]: 'citizen',
  [Role.POSSESSOR]: 'citizen',
  [Role.REPORTER]: 'citizen',
  [Role.POLITICIAN]: 'citizen',
  [Role.MADMAN]: 'citizen',
  [Role.SHAMAN]: 'citizen',
  [Role.TERMINAL_PATIENT]: 'citizen',
};

export const MAFIA_BODY_ROLES: Role[] = [Role.MAFIA];
export const MAFIA_COLLABORATOR_ROLES: Role[] = [
  Role.ROOKIE_MAFIA,
  Role.HACKER,
  Role.MADAM,
  Role.BURGLAR,
  Role.CULT_MONK,
];
export const CITIZEN_BASIC_ROLES: Role[] = [
  Role.CITIZEN,
  Role.ANDROID,
  Role.DOCTOR,
  Role.POLICE,
];
export const CITIZEN_SPECIAL_ROLES: Role[] = [
  Role.COUPLE,
  Role.PRIEST,
  Role.POSSESSOR,
  Role.REPORTER,
  Role.POLITICIAN,
  Role.MADMAN,
  Role.SHAMAN,
  Role.TERMINAL_PATIENT,
];
