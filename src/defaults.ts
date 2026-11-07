import {
  initialLift,
  rule,
  type Equipment,
  type Exercise,
  type Prescription,
  type State,
} from "./model";
const definitions: [string, string, Equipment, string][] = [
  [
    "squat",
    "Barbell Back Squat",
    "barbell",
    "Squat with the bar across your upper back. Brace and use a controlled range of motion.",
  ],
  [
    "bench",
    "Barbell Bench Press",
    "barbell",
    "Press from a stable bench position. Use a spotter or safety arms.",
  ],
  [
    "row",
    "Bent-Over Barbell Row",
    "barbell",
    "Hinge at the hips and row toward your torso with a braced back.",
  ],
  [
    "ohp",
    "Standing Barbell Overhead Press",
    "barbell",
    "Press overhead from standing with a braced torso.",
  ],
  [
    "deadlift",
    "Conventional Barbell Deadlift",
    "barbell",
    "Lift from the floor with the bar close to your body.",
  ],
  [
    "front-squat",
    "Front Squat",
    "barbell",
    "Hold a front rack and squat with an upright torso.",
  ],
  [
    "incline-bench",
    "Incline Bench Press",
    "barbell",
    "Press on an inclined bench.",
  ],
  [
    "db-bench",
    "Dumbbell Bench Press",
    "dumbbell",
    "Press a dumbbell in each hand; log weight per dumbbell.",
  ],
  [
    "db-ohp",
    "Dumbbell Overhead Press",
    "dumbbell",
    "Press dumbbells overhead; log weight per dumbbell.",
  ],
  [
    "trap-deadlift",
    "Trap-Bar Deadlift",
    "barbell",
    "Lift using the neutral handles of a trap bar. Set bar weight to match equipment.",
  ],
  [
    "cable-row",
    "Seated Cable Row",
    "machine",
    "Row with a controlled torso and neutral wrists.",
  ],
  [
    "dips",
    "Dips",
    "weighted bodyweight",
    "Lower and press on parallel bars; weight is added external load.",
  ],
  [
    "pullups",
    "Pull-ups",
    "weighted bodyweight",
    "Pull toward the bar using an overhand grip; log added load separately.",
  ],
  [
    "chinups",
    "Chin-ups",
    "weighted bodyweight",
    "Pull toward the bar using an underhand grip.",
  ],
  ["curl", "Barbell Curl", "barbell", "Curl without swinging the torso."],
  [
    "db-curl",
    "Dumbbell Curl",
    "dumbbell",
    "Curl dumbbells with controlled elbows.",
  ],
  ["hammer", "Hammer Curl", "dumbbell", "Curl with palms facing inward."],
  [
    "rdl",
    "Romanian Deadlift",
    "barbell",
    "Hinge with soft knees, keeping the bar close.",
  ],
  [
    "lateral",
    "Dumbbell Lateral Raise",
    "dumbbell",
    "Raise dumbbells out to the sides under control.",
  ],
  [
    "face-pull",
    "Face Pull",
    "machine",
    "Pull a rope toward your face with elbows out.",
  ],
  [
    "triceps",
    "Triceps Extension",
    "machine",
    "Extend elbows against resistance.",
  ],
  [
    "skull",
    "Skull Crusher",
    "barbell",
    "Bend and extend elbows while lying on a bench.",
  ],
  [
    "leg-raise",
    "Hanging Leg Raise",
    "bodyweight",
    "Raise legs from a controlled hang without swinging.",
  ],
  [
    "knee-raise",
    "Hanging Knee Raise",
    "bodyweight",
    "Raise bent knees from a controlled hang.",
  ],
  [
    "plank",
    "Plank",
    "timed",
    "Hold a braced plank. Repetition fields record seconds.",
  ],
  [
    "ab-wheel",
    "Ab Wheel",
    "bodyweight",
    "Roll out only as far as you can maintain trunk control.",
  ],
  [
    "back-extension",
    "Back Extension",
    "weighted bodyweight",
    "Extend through the hips on a back extension bench.",
  ],
  [
    "calf",
    "Calf Raise",
    "machine",
    "Raise heels through a comfortable range of motion.",
  ],
  [
    "cable-lateral",
    "Single-arm Cable Lateral Raise",
    "machine",
    "Stand side-on to a cable pulley with a single handle. Raise one arm out to the side without shrugging or swinging, then lower slowly. Complete the target reps on each side before logging a set; record the stack load for one arm.",
  ],
  [
    "db-reverse-fly",
    "Dumbbell Reverse Fly",
    "dumbbell",
    "Sit and lean forward with a dumbbell in each hand, elbows slightly bent. Raise the arms out to the sides and lower slowly without swinging. Keep your back steady; a chest-supported bench is another option. Record weight per dumbbell. This rear-shoulder and upper-back accessory differs from a face pull’s elbow and rotation movement.",
  ],
  [
    "db-calf-raise",
    "Standing Dumbbell Calf Raise",
    "dumbbell",
    "Stand with feet about hip-width apart and a dumbbell in each hand. Raise both heels, pause, then lower with control without bouncing. Use a load you can balance safely. Record weight per dumbbell; zero means no external load. Standing and seated calf raises differ in muscle emphasis.",
  ],
];
export const catalog: Exercise[] = definitions.map(
  ([id, name, equipment, description]) => ({
    id,
    name,
    equipment,
    description,
  }),
);
// Additive catalog update for existing installs and supported backups. Never
// replace user-edited definitions, progression, templates, or session snapshots.
export const accessoryAdditionIds = [
  "cable-lateral",
  "db-reverse-fly",
  "db-calf-raise",
];
function initialCatalogWeight(exercise: Exercise): number {
  if (
    [
      "bodyweight",
      "weighted bodyweight",
      "assisted bodyweight",
      "timed",
    ].includes(exercise.equipment)
  )
    return 0;
  if (exercise.equipment === "dumbbell") return 5;
  return exercise.id === "cable-lateral" ? 0 : 20;
}
export function addAccessoryCatalogEntries(state: State): State {
  for (const exercise of catalog.filter((e) =>
    accessoryAdditionIds.includes(e.id),
  )) {
    if (state.exercises.some((saved) => saved.id === exercise.id)) continue;
    if (state.exercises.length >= 1000) continue; // Preserve valid full custom libraries.
    state.exercises.push(structuredClone(exercise));
    state.progression[exercise.id] = initialLift(
      initialCatalogWeight(exercise),
    );
  }
  return state;
}
const rx = (
  exerciseId: string,
  core: boolean,
  sets: number,
  minReps: number,
  maxReps = minReps,
): Prescription => ({
  exerciseId,
  core,
  sets,
  minReps,
  maxReps,
  rest: core ? 180 : 90,
  rule: rule(core ? "linear" : "double"),
});
export function freshState(): State {
  const A = [
    rx("squat", true, 5, 5),
    rx("bench", true, 5, 5),
    rx("row", true, 5, 5),
    rx("dips", false, 3, 6, 10),
    rx("leg-raise", false, 3, 8, 15),
  ];
  const B = [
    rx("squat", true, 5, 5),
    rx("ohp", true, 5, 5),
    rx("deadlift", true, 1, 5),
    rx("pullups", false, 3, 5, 10),
    rx("lateral", false, 3, 10, 15),
  ];
  B[2].rule.increment = 5;
  return {
    schemaVersion: 3,
    exercises: structuredClone(catalog),
    templates: { A, B },
    progression: Object.fromEntries(
      catalog.map((e) => [e.id, initialLift(initialCatalogWeight(e))]),
    ),
    history: [],
    active: null,
    next: "A",
    settings: {
      units: "kg",
      barWeight: 20,
      plateIncrement: 2.5,
      defaultRest: 180,
      audio: false,
      vibration: true,
      theme: "dark",
    },
    timerEnd: null,
    lastBackup: null,
    workoutsSinceBackup: 0,
    reminderDismissedAt: null,
    createdAt: new Date().toISOString(),
  };
}
