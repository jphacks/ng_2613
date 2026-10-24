import { useState } from "react";
import type { DiscussionState } from "../hooks/use-discussion-state";
import ThreadScreen from "./thread-screen";

type Props = Pick<DiscussionState, "navigate">;

export default function NewThreadScreen({ navigate }: Props) {
    const [messages, setMessages] = useState<DiscussionState["messages"]>([]);
    const [message, setMessage] = useState("");
    const [stance, setStance] = useState("賛成");

    return <ThreadScreen {...{ messages, setMessages, message, setMessage, stance, setStance, navigate }} showDemoMessages={false} />;
}
