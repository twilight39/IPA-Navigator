import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";

export function usePhonemeFeedbacks() {
  const feedbacks = useQuery(api.functions.phonemes.getAllPhonemeFeedbacks) ||
    [];
  const feedbackMap = new Map<string, typeof feedbacks[0]>();
  for (const fb of feedbacks) {
    feedbackMap.set(fb.phoneme, fb);
  }
  return { feedbacks, feedbackMap };
}
