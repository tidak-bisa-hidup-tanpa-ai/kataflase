import ChatBox from '../room/ChatBox'
import ClueList from '../room/ClueList'
import PhaseBar from '../room/PhaseBar'

export default function DiscussionPhase() {
  return (
    <div className="pb-24 lg:pb-0">
      <PhaseBar title="Siapa yang janggal?" barColor="bg-cobalt" />
      <div className="lg:mt-2 lg:grid lg:grid-cols-[20rem_1fr] lg:items-start lg:gap-10">
        <section>
          <h2 className="label mt-5">Petunjuk ronde ini</h2>
          <ClueList variant="grid" />
        </section>
        <ChatBox canSend />
      </div>
    </div>
  )
}
