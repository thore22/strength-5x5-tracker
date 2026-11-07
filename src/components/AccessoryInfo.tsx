import type { Exercise } from "../model";
import ExerciseResources from "./ExerciseResources";
import ModalSheet from "./ModalSheet";

export default function AccessoryInfo({
  exercise,
  close,
}: {
  exercise: Exercise;
  close: () => void;
}) {
  return (
    <ModalSheet
      title={exercise.name}
      closeLabel="Close exercise information"
      close={close}
    >
      <p className="badge">ACCESSORY · {exercise.equipment}</p>
      <p>
        {exercise.description ||
          "No description saved for this exercise. Use the searches below to find technique information."}
      </p>
      <ExerciseResources exercise={exercise} />
      <p className="previous">
        Search links open a new tab and require internet access.
      </p>
    </ModalSheet>
  );
}
