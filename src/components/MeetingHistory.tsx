type MeetingHistoryItem = {
  id: number;
  title: string;
  summary: string;
  generatedAt: string;
};

type Props = {
  history: MeetingHistoryItem[];
};

export default function MeetingHistory({
  history,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-8">
      <h2 className="text-3xl font-bold mb-6">
        Meeting History
      </h2>

      {history.length ===
        0 ? (
        <p className="text-gray-500">
          No meeting history yet.
        </p>
      ) : (
        <div className="space-y-4">
          {history.map(
            (meeting) => (
              <div
                key={
                  meeting.id
                }
                className="border rounded-xl p-5 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">
                    {
                      meeting.title
                    }
                  </h3>

                  <span className="text-sm text-gray-500">
                    {
                      meeting.generatedAt
                    }
                  </span>
                </div>

                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {
                    meeting.summary
                  }
                </pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}