type SummaryProps = {
  summaries: string[];
};

export default function SummaryList({
  summaries,
}: SummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-4">
        AI Generated Summaries
      </h2>

      {summaries.length === 0 ? (
        <p className="text-gray-500">
          No summaries generated yet.
        </p>
      ) : (
        <div className="space-y-4">
          {summaries.map(
            (summary, index) => (
              <div
                key={index}
                className="border rounded-xl p-4 bg-gray-50"
              >
                <h3 className="font-semibold mb-2">
                  Meeting #{index + 1}
                </h3>

                <p className="whitespace-pre-wrap text-sm">
                  {summary}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}