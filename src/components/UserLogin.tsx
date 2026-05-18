"use client";

import {
  signIn,
  signOut,
  useSession,
} from "next-auth/react";

export default function UserLogin() {
  const { data: session } = useSession();

  return (
    <div className="mt-8 px-4">
      {session ? (
        <>
          <h2>
            Welcome{" "}
            {session.user?.name}
          </h2>

          <button className="cursor-pointer"
            onClick={() => signOut()}
          >
            Logout
          </button>
        </>
      ) : (
        <button className="cursor-pointer"
          onClick={() =>
            signIn("google")
          }
        >
          Login with Google
        </button>
      )}
    </div>
  );
}