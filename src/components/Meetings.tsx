type Meeting = {
  summary: string;

  start: {
    dateTime: string;
  };

  hangoutLink?: string;
};

type Props = {
  meetings: Meeting[];
};

export default function Meetings({
  meetings,
}: Props) {
  return (
    <div>
      <h2 className="text-5xl font-bold text-slate-900">
        Todays Meetings
      </h2>

      <p className="text-gray-500 mt-2">
        Your upcoming Google Meet
        schedule
      </p>

      <div className="mt-6 space-y-4">
        {meetings.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            No meetings found
          </div>
        ) : (
          meetings.map(
            (
              meeting,
              index
            ) => (
              <div
                key={index}
                className="bg-white border rounded-2xl p-5 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {
                      meeting.summary
                    }
                  </h3>

                  <p className="text-gray-500 mt-2">
                    {meeting.start
                      ?.dateTime
                      ? new Date(
                          meeting.start.dateTime
                        ).toLocaleTimeString(
                          [],
                          {
                            hour:
                              "2-digit",
                            minute:
                              "2-digit",
                          }
                        )
                      : "All Day"}
                  </p>
                </div>

                {meeting.hangoutLink && (
                  <button
                    onClick={() =>
                      window.open(
                        meeting.hangoutLink,
                        "_blank"
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                  >
                    Join Meet
                  </button>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}