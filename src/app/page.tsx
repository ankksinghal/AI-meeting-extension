import UserLogin from "../components/UserLogin";
import Meetings from "../components/Meetings";
import TranscriptUpload from "../components/TranscriptUpload";


export default function Home() {
  return (
    <div className="text-base">
      <UserLogin />
      <Meetings />
      <TranscriptUpload/>
    </div>
  );
}
