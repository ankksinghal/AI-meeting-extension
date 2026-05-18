"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface Meeting {
  id: string;
  summary: string;
  hangoutLink?: string;
  start?: {
    dateTime?: string;
  };
}

export default function Meetings() {
  const { data: session } = useSession();

  const [meetings, setMeetings] = useState<
    Meeting[]
  >([]);

  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchMeetings = async () => {
      try {
        const now = new Date();

        const endOfDay = new Date();

        endOfDay.setHours(
          23,
          59,
          59,
          999
        );

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        const data = await response.json();

        const googleMeetEvents =
          (data.items || []).filter(
            (meeting: Meeting) =>
              meeting.hangoutLink
          );

        setMeetings(googleMeetEvents);
      } catch (error) {
        console.error(
          "Failed to fetch meetings",
          error
        );
      }
    };

    fetchMeetings();
  }, [session]);

  return (
    <div className="mt-8 px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Today&apos;s Meetings
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Your upcoming Google Meet
          schedule
        </p>
      </div>

      {meetings.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <p className="text-gray-500 text-center">
            No upcoming meetings today
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {meeting.summary ||
                    "Untitled Meeting"}
                </h3>

                <p className="text-sm text-gray-500 mt-2">
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
                    : "No Time"}
                </p>
              </div>

              {meeting.hangoutLink && (
                <a
                  href={
                    meeting.hangoutLink
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Join Meet
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}