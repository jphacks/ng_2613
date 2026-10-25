import type { DiscussionState } from "../hooks/use-discussion-state";
import { ThreadView } from "./thread-screen";

type Props = Pick<DiscussionState, "profile" | "selectedFrame" | "selectedFrameNumber" | "threadSubmitting" | "threadSubmitError" | "createDiscussionThread">;

// 最初の意見を送るとスレッドを作る。一覧に出すタイトルは本文の1行目から取る。
export default function NewThreadScreen({ profile, selectedFrame, selectedFrameNumber, threadSubmitting, threadSubmitError, createDiscussionThread }: Props) {
    return <ThreadView {...{ profile, selectedFrame, selectedFrameNumber }} messages={[]} submitting={threadSubmitting} error={threadSubmitError} allowNeutral={false} onSend={(body, stance) => stance ? createDiscussionThread({ title: body.split("\n")[0].slice(0, 40), body, stance }) : Promise.resolve(false)} />;
}
