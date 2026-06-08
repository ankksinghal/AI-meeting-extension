"use client";

type Meeting = {
  summary: string;

  start: {
    dateTime: string;
  };

  hangoutLink?: string;

  attendees?: {
    email: string;
  }[];
};

type Props = {
  meetings: Meeting[];

  onSelectMeeting: (
    meeting: Meeting
  ) => void;
};

export default function Meetings({
  meetings,
  onSelectMeeting,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">
        Upcoming Meetings
      </h2>

      <div className="space-y-4">
        {meetings.map(
          (
            meeting,
            index
          ) => (
            <div
              key={index}
              className="border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold">
                  {
                    meeting.summary
                  }
                </h3>

                <p className="text-sm text-gray-500">
                  {new Date(
                    meeting.start.dateTime
                  ).toLocaleTimeString()}
                </p>
              </div>

              {meeting.hangoutLink && (
                <button
                  onClick={() => {
                    onSelectMeeting(
                      meeting
                    );

                    window.open(
                      meeting.hangoutLink,
                      "_blank"
                    );
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Join Meet
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}