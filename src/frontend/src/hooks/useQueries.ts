import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

export function useGetSessions() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSessions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (duration: bigint) => {
      if (!actor) throw new Error("No actor");
      await actor.addSession(duration);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}
