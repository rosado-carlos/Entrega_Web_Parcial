import {
  AttendanceStatusEnum,
  ParcheRoleEnum,
  PlanStateEnum,
  type Attendance,
  type Parche,
  type Plan,
  type User,
  type Vote,
} from "../types";

export const seedUsers: User[] = [
  {
    id: "1",
    fullName: "Fernando Gómez",
    email: "fer@uni.edu",
    major: "Física",
    password: "1234",
  },
  {
    id: "2",
    fullName: "Carlos Rosado",
    email: "carlos@uni.edu",
    major: "Ingeniería Mecatrónica",
    password: "1234",
  },
  {
    id: "3",
    fullName: "Sara López",
    email: "sara@uni.edu",
    major: "Ingeniería Administrativa",
    avatarUrl: "https://i.pravatar.cc/80?img=9",
    password: "1234",
  },
  {
    id: "4",
    fullName: "Daniel Pardo",
    email: "daniel@uni.edu",
    major: "Medicina",
    password: "1234",
  },
  {
    id: "5",
    fullName: "Camila Ríos",
    email: "camila@uni.edu",
    major: "Ingeniería de Sistemas",
    avatarUrl: "https://i.pravatar.cc/80?img=16",
    password: "1234",
  },
  {
    id: "6",
    fullName: "Nicolás Mejía",
    email: "nico@uni.edu",
    major: "Ingeniería de Sistemas",
    password: "1234",
  },
  {
    id: "7",
    fullName: "Valentina Pérez",
    email: "vale@uni.edu",
    major: "Ingeniería Mecánica",
    avatarUrl: "https://i.pravatar.cc/80?img=24",
    password: "1234",
  },
  {
    id: "8",
    fullName: "Felipe Ortiz",
    email: "felipe@uni.edu",
    major: "Economía",
    password: "1234",
  },
  {
    id: "9",
    fullName: "Juliana Castro",
    email: "juli@uni.edu",
    major: "Ingeniería Biotecnológica",
    avatarUrl: "https://i.pravatar.cc/80?img=5",
    password: "1234",
  },
  {
    id: "10",
    fullName: "Andrés Quintero",
    email: "andres@uni.edu",
    major: "Ingeniería Civil",
    avatarUrl: "https://i.pravatar.cc/80?img=12",
    password: "1234",
  },
];

export const seedParches: Parche[] = [
  {
    id: "1",
    name: "Parche Viernes Chill",
    description: "Planear salidas tranquilas para los viernes.",
    coverImageUrl:
      "https://estaticos.elcolombiano.com/binrepository/861x565/41c0/780d565/none/11101/CUCC/whatsapp-image-2023-10-17-at-2-46-07-pm_43526598_20231017145219.jpg",
    inviteCode: "CHILL-123",
    members: [
      { userId: "1", role: ParcheRoleEnum.owner },
      { userId: "2", role: ParcheRoleEnum.moderator },
      { userId: "3", role: ParcheRoleEnum.member },
      { userId: "4", role: ParcheRoleEnum.member },
      { userId: "5", role: ParcheRoleEnum.member },
      { userId: "6", role: ParcheRoleEnum.member },
    ],
  },
  {
    id: "2",
    name: "Parche Envigado",
    description: "Grupo para salir después de clase en Envigado.",
    coverImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/21/Envigad_foto_alcaldia-de-envigado.png",
    inviteCode: "SUR-456",
    members: [
      { userId: "7", role: ParcheRoleEnum.owner },
      { userId: "8", role: ParcheRoleEnum.moderator },
      { userId: "9", role: ParcheRoleEnum.member },
      { userId: "10", role: ParcheRoleEnum.member },
      { userId: "1", role: ParcheRoleEnum.member },
      { userId: "3", role: ParcheRoleEnum.member },
    ],
  },
];

export const seedPlans: Plan[] = Array.from({ length: 15 }, (_, index) => {
  const planNumberId = index + 1;
  const planId = String(planNumberId);

  const isFirstParche = planNumberId <= 8;
  const parcheId = isFirstParche ? "1" : "2";
  const createdBy = isFirstParche ? "1" : "7";

  const now = new Date();
  const checkInStartDate = new Date(now.getTime() - 60 * 60 * 1000);
  const checkInEndDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return {
    id: planId,
    parcheId,
    createdBy,
    title: `Plan #${planNumberId}`,
    description: `Descripción simple del plan ${planNumberId}.`,
    dateStart: "2026-03-10",
    dateEnd: "2026-03-20",
    state:
      planNumberId % 4 === 0
        ? PlanStateEnum.scheduled
        : PlanStateEnum.votingOpen,
    options: [
      {
        id: String(planNumberId * 10 + 1),
        place: "Calle de la Cultura",
        time: "10:00",
      },
      {
        id: String(planNumberId * 10 + 2),
        place: "Terraza Bloque A",
        time: "14:00",
      },
      {
        id: String(planNumberId * 10 + 3),
        place: "Nativos",
        time: "12:00",
      },
    ],
    winningOptionId:
      planNumberId % 4 === 0 ? String(planNumberId * 10 + 1) : undefined,
    votingDeadline: "2099-12-31T23:59",
    checkInStart: checkInStartDate.toISOString(),
    checkInEnd: checkInEndDate.toISOString(),
  };
});

export const seedVotes: Vote[] = Array.from({ length: 30 }, (_, index) => {
  const plan = seedPlans[index % seedPlans.length];
  const parche = seedParches.find((candidate) => candidate.id === plan.parcheId);

  const memberUserIds = parche?.members.map((member) => member.userId) ?? ["1"];
  const userId = memberUserIds[index % memberUserIds.length];
  const option = plan.options[index % plan.options.length];

  return {
    planId: plan.id,
    userId,
    optionId: option.id,
  };
});

export const seedAttendance: Attendance[] = seedPlans.flatMap((plan) => {
  const parche = seedParches.find((p) => p.id === plan.parcheId);

  if (!parche) return [];

  return parche.members.map((member, memberIndex) => {
    const planNumberId = Number(plan.id);
    const memberNumberId = Number(member.userId);
    const statusIndex = (planNumberId + memberNumberId + memberIndex) % 3;

    const status =
      statusIndex === 0
        ? AttendanceStatusEnum.yes
        : statusIndex === 1
          ? AttendanceStatusEnum.no
          : AttendanceStatusEnum.maybe;

    return {
      planId: plan.id,
      userId: member.userId,
      status,
      checkedIn:
        status === AttendanceStatusEnum.yes &&
        (planNumberId + memberNumberId) % 4 === 0,
    };
  });
});