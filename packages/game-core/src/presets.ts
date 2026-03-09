import { Role } from '@mafia/shared';

/** Returns the ordered list of roles for a given player count (4–12). */
export function getPreset(playerCount: number): Role[] {
  const randomCollaborator = (): Role => {
    const collaborators: Role[] = [
      Role.HACKER,
      Role.MADAM,
      Role.BURGLAR,
      Role.CULT_MONK,
    ];
    return collaborators[Math.floor(Math.random() * collaborators.length)];
  };

  const randomSpecialCitizen = (): Role => {
    const specials: Role[] = [
      Role.PRIEST,
      Role.POSSESSOR,
      Role.REPORTER,
      Role.POLITICIAN,
      Role.MADMAN,
      Role.SHAMAN,
      Role.TERMINAL_PATIENT,
    ];
    return specials[Math.floor(Math.random() * specials.length)];
  };

  const pickUniqueSpecials = (count: number): Role[] => {
    const specials: Role[] = [
      Role.PRIEST,
      Role.POSSESSOR,
      Role.REPORTER,
      Role.POLITICIAN,
      Role.MADMAN,
      Role.SHAMAN,
      Role.TERMINAL_PATIENT,
    ];
    const shuffled = [...specials].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  switch (playerCount) {
    case 4:
      return [Role.MAFIA, Role.CITIZEN, Role.CITIZEN, Role.POLICE];
    case 5:
      return [
        Role.MAFIA,
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
      ];
    case 6:
      return [
        Role.MAFIA,
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
      ];
    case 7:
      return [
        Role.MAFIA,
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.REPORTER,
      ];
    case 8: {
      // SpecialCitizen×1 OR Collaborator×1 random
      const extra =
        Math.random() < 0.5 ? randomSpecialCitizen() : randomCollaborator();
      return [
        Role.MAFIA,
        Role.MAFIA,
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.REPORTER,
        extra,
      ];
    }
    case 9:
      return [
        Role.MAFIA,
        Role.MAFIA,
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.REPORTER,
        randomSpecialCitizen(),
      ];
    case 10: {
      // if Couple is chosen as special, add extra Citizen
      const special1 = randomSpecialCitizen();
      const special2 = randomSpecialCitizen();
      const roles: Role[] = [
        Role.MAFIA,
        Role.MAFIA,
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.ANDROID,
        special1,
        special2,
      ];
      // Replace duplicate specials with Citizen
      if (special1 === special2) roles[9] = Role.CITIZEN;
      return roles;
    }
    case 11:
      return [
        Role.MAFIA,
        Role.MAFIA,
        randomCollaborator(),
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.ANDROID,
        ...pickUniqueSpecials(2),
      ];
    case 12:
      return [
        Role.MAFIA,
        Role.MAFIA,
        randomCollaborator(),
        randomCollaborator(),
        Role.CITIZEN,
        Role.CITIZEN,
        Role.POLICE,
        Role.DOCTOR,
        Role.ANDROID,
        ...pickUniqueSpecials(3),
      ];
    default:
      throw new Error(`No preset for player count: ${playerCount}`);
  }
}
