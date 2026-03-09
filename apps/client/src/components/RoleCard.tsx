import { Role, RoleKoreanName } from '@mafia/shared';

const roleDescriptions: Record<Role, string> = {
  [Role.MAFIA]: '밤마다 시민 한 명을 제거합니다.',
  [Role.ROOKIE_MAFIA]: '마피아 본체가 모두 사망하면 마피아 역할을 계승합니다.',
  [Role.HACKER]: '밤마다 한 명을 해킹합니다.',
  [Role.MADAM]: '대상을 취하게 만들거나 커플 관계를 깨뜨립니다.',
  [Role.BURGLAR]: '대상이 다음 투표에서 투표할 수 없게 합니다.',
  [Role.CULT_MONK]: '대상을 포교합니다.',
  [Role.CITIZEN]: '특별한 능력이 없는 평범한 시민입니다.',
  [Role.ANDROID]: '경찰 조사 시 시민으로 표시됩니다.',
  [Role.DOCTOR]: '밤마다 한 명을 치료하여 마피아 공격으로부터 보호합니다.',
  [Role.POLICE]: '밤마다 한 명을 조사하여 마피아 여부를 확인합니다.',
  [Role.COUPLE]: '2인 1조. 한 명이 공격받으면 상대방이 대신 사망합니다.',
  [Role.PRIEST]: '밤마다 한 명을 축복합니다.',
  [Role.POSSESSOR]: '밤마다 한 명에게 빙의합니다.',
  [Role.REPORTER]: '밤마다 한 명을 취재합니다.',
  [Role.POLITICIAN]: '투표에서 2표를 행사합니다. 취하면 1표로 줄고 처형 가능해집니다.',
  [Role.MADMAN]: '경찰 조사 시 마피아로 표시됩니다.',
  [Role.SHAMAN]: '밤마다 사망한 플레이어의 역할을 확인합니다.',
  [Role.TERMINAL_PATIENT]: '특정 라운드 이후 자동으로 사망합니다.',
};

const teamColors: Record<string, string> = {
  mafia_body: '#c0392b',
  mafia_collaborator: '#e67e22',
  citizen: '#2980b9',
};

const teamLabels: Record<string, string> = {
  mafia_body: '마피아 본체',
  mafia_collaborator: '마피아 협력자',
  citizen: '시민',
};

interface RoleCardProps {
  role: Role;
}

export default function RoleCard({ role }: RoleCardProps) {
  const korName = RoleKoreanName[role];
  const desc = roleDescriptions[role];

  // Determine team
  const mafiaBodyRoles = [Role.MAFIA];
  const mafiaCollabRoles = [
    Role.ROOKIE_MAFIA,
    Role.HACKER,
    Role.MADAM,
    Role.BURGLAR,
    Role.CULT_MONK,
  ];
  let team = 'citizen';
  if (mafiaBodyRoles.includes(role)) team = 'mafia_body';
  else if (mafiaCollabRoles.includes(role)) team = 'mafia_collaborator';

  const color = teamColors[team];

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 8,
        padding: 16,
        margin: '8px 0',
        background: `${color}11`,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 'bold', color }}>
        {korName}
      </div>
      <div
        style={{
          fontSize: 12,
          color,
          marginBottom: 8,
          fontWeight: 'bold',
        }}
      >
        {teamLabels[team]}
      </div>
      <div style={{ fontSize: 14, color: '#444' }}>{desc}</div>
    </div>
  );
}
