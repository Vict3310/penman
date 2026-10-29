import { Fragment } from "react";

/** Keep the words in the server-rendered tree so animation never rewrites hydrated text. */
export function MotionWords({ text }: { text: string }) {
  return (
    <>
      {text.trim().split(/\s+/).map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          {index > 0 && " "}
          <span data-motion-word className="inline-block">{word}</span>
        </Fragment>
      ))}
    </>
  );
}
