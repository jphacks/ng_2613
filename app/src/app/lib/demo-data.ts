import taxImage from "../images/税金.svg";
import pricesImage from "../images/物価賃金.svg";
import budgetImage from "../images/国の財政.svg";
import financeImage from "../images/金融投資.svg";
export type Screen = "home" | "topics" | "summary" | "discussion" | "thread" | "vote" | "video" | "login" | "register" | "profile";
export const screens: Screen[] = ["home", "topics", "summary", "discussion", "thread", "vote", "video", "login", "register", "profile"];
export const topics = [
    { label: "税金", image: taxImage },
    { label: "物価・賃金", image: pricesImage },
    { label: "国の財政", image: budgetImage },
    { label: "金融・投資", image: financeImage },
];
export const opinionLabels = ["反対", "やや反対", "中立", "やや賛成", "賛成"];
export const opinionColors = ["#ed5374", "#efa1b2", "#d9d9d9", "#83c6e9", "#49a3d3"];
