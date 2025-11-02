export type BadgeTier = "bronze" | "silver" | "gold";

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
};

export const BADGES: BadgeDefinition[] = [
  // Practice Milestones
  {
    id: "first_steps",
    name: "First Steps",
    description: "Complete your first practice",
    icon: "👣",
    tier: "bronze",
  },
  {
    id: "dedicated_learner",
    name: "Dedicated Learner",
    description: "Complete 10 practice sessions",
    icon: "📚",
    tier: "silver",
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Complete 100 practice sessions",
    icon: "💯",
    tier: "gold",
  },

  // Accuracy
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Achieve 100% accuracy on a chapter",
    icon: "⭐",
    tier: "gold",
  },
  {
    id: "consistent",
    name: "Consistent",
    description: "Maintain 85%+ average accuracy",
    icon: "📈",
    tier: "silver",
  },
  {
    id: "master",
    name: "Master",
    description: "Maintain 95%+ average accuracy",
    icon: "🎖️",
    tier: "gold",
  },

  // Streaks
  {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "🔥",
    tier: "silver",
  },
  {
    id: "month_master",
    name: "Month Master",
    description: "Maintain a 30-day streak",
    icon: "🏆",
    tier: "gold",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Maintain a 60-day streak",
    icon: "💪",
    tier: "gold",
  },

  // Social
  {
    id: "community_builder",
    name: "Community Builder",
    description: "Create a classroom",
    icon: "🏗️",
    tier: "silver",
  },
  {
    id: "team_player",
    name: "Team Player",
    description: "Join a classroom",
    icon: "👥",
    tier: "bronze",
  },
  {
    id: "influencer",
    name: "Influencer",
    description: "Receive 10+ likes on chapters",
    icon: "⭐",
    tier: "silver",
  },
];
