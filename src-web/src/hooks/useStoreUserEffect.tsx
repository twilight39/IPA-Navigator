import { useUser } from "@clerk/clerk-react";
// import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import type { Id } from "../../convex/_generated/dataModel.d.ts";

export function useStoreUserEffect() {
  // const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded, user } = useUser();

  // When this state is set we know the server has stored the user.
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.functions.users.store);

  // Call the `storeUser` mutation function to store
  // the current user in the `users` table and return the `Id` value.
  useEffect(() => {
    // If the user is not logged in don't do anything
    if (!isLoaded || !user) {
      return;
    }

    // Store the user in the database
    async function createUser() {
      const id = await storeUser();
      setUserId(id);
    }

    createUser();
    return () => setUserId(null);
    // Make sure the effect reruns if the user logs in with
    // a different identity
  }, [isLoaded, storeUser, user?.id]);

  // Combine the local state with the state from context
  return {
    isLoading: !isLoaded || (userId === null),
    isAuthenticated: userId !== null,
    userId: userId,
  };
}
