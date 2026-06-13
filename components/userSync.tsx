"use client";

import { syncUser } from "@/lib/actions/user";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

function userSync() {
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    const handleUserSync = async () => {
      if (isLoaded && isSignedIn) {
        try {
          await syncUser();
        } catch (error) {
          console.error("User sync failed:", error);
        }
      }
    };
    handleUserSync();
  }, [isLoaded, isSignedIn]);
  return null;
}

export default userSync;
