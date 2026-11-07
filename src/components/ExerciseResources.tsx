import type { Exercise } from "../model";

export default function ExerciseResources({
  exercise,
}: {
  exercise: Exercise;
}) {
  const load = {
    dumbbell: "Log load per dumbbell.",
    barbell: "Working load includes the bar.",
    machine:
      "Record the machine’s displayed load. Loads differ between machines.",
    "assisted bodyweight":
      "Weight records assistance, separately from repetitions. Less assistance is harder.",
    "weighted bodyweight":
      "Weight records added load, separately from bodyweight repetitions.",
    bodyweight: "Log repetitions without added load.",
    timed: "Repetition fields record seconds.",
  }[exercise.equipment];
  return (
    <>
      <p>{load}</p>
      <div className="row exercise-links">
        {[
          ["Google", "https://www.google.com/search?q="],
          ["Images", "https://www.google.com/search?tbm=isch&q="],
          ["YouTube", "https://www.youtube.com/results?search_query="],
        ].map(([label, url]) => (
          <a
            key={label}
            href={`${url}${encodeURIComponent(exercise.name + " exercise technique")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label} ↗
          </a>
        ))}
      </div>
    </>
  );
}
