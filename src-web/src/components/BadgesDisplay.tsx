import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { BADGES } from "../../convex/models/badges.ts";
import {
  BooksIcon,
  CheckCircleIcon,
  FireIcon,
  HammerIcon,
  LightningIcon,
  MedalIcon,
  PersonSimpleWalkIcon,
  SparkleIcon,
  StarIcon,
  TrendUpIcon,
  TrophyIcon,
  UsersIcon,
} from "@phosphor-icons/react";

const ICON_COMPONENTS: Record<string, React.ReactNode> = {
  first_steps: (
    <PersonSimpleWalkIcon size={32} weight="duotone" color="#ffffff" />
  ),
  dedicated_learner: <BooksIcon size={32} weight="duotone" color="#ffffff" />,
  century_club: <CheckCircleIcon size={32} weight="duotone" color="#ffffff" />,
  perfectionist: <StarIcon size={32} weight="duotone" color="#ffffff" />,
  consistent: <TrendUpIcon size={32} weight="duotone" color="#ffffff" />,
  master: <MedalIcon size={32} weight="duotone" color="#ffffff" />,
  week_warrior: <FireIcon size={32} weight="duotone" color="#ffffff" />,
  month_master: <TrophyIcon size={32} weight="duotone" color="#ffffff" />,
  unstoppable: <LightningIcon size={32} weight="duotone" color="#ffffff" />,
  community_builder: <HammerIcon size={32} weight="duotone" color="#ffffff" />,
  team_player: <UsersIcon size={32} weight="duotone" color="#ffffff" />,
  influencer: <SparkleIcon size={32} weight="duotone" color="#ffffff" />,
};

const TIER_COLORS = {
  bronze: { main: "#FF6B35", light: "#FF8C42", dark: "#E55100" },
  silver: { main: "#00D9FF", light: "#33E9FF", dark: "#0099CC" },
  gold: { main: "#FFD93D", light: "#FFED4E", dark: "#FFA500" },
};

export function BadgesDisplay() {
  const userBadges = useQuery(api.functions.gamification.getUserBadges, {});

  if (!userBadges) {
    return <div className="loading loading-spinner loading-sm"></div>;
  }

  const earnedBadgeIds = new Set(userBadges.map((b) => b.badgeId));
  const earnedBadges = BADGES.filter((b) => earnedBadgeIds.has(b.id));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold">
          Badges ({earnedBadges.length})
        </p>
      </div>

      {earnedBadges.length === 0
        ? (
          <p className="text-sm text-slate-500">
            No badges earned yet. Start practicing!
          </p>
        )
        : (
          <div className="overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {earnedBadges.map((badge) => {
                const colors = TIER_COLORS[badge.tier];
                return (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center flex-shrink-0"
                  >
                    <div
                      className="flex items-center justify-center relative"
                      style={{
                        width: "72px",
                        height: "72px",
                      }}
                    >
                      {/* Outer shadow */}
                      <div
                        style={{
                          position: "absolute",
                          width: "72px",
                          height: "72px",
                          background:
                            `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%)`,
                          clipPath:
                            "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
                          boxShadow: `0 4px 12px rgba(0,0,0,0.25)`,
                        }}
                      />

                      {/* Beveled border with metallic gradient */}
                      <div
                        style={{
                          position: "absolute",
                          width: "72px",
                          height: "72px",
                          background:
                            `linear-gradient(135deg, #ffffff 0%, #e0e0e0 25%, #999999 75%, #555555 100%)`,
                          clipPath:
                            "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
                        }}
                      />

                      {/* Main badge */}
                      <div
                        className="flex items-center justify-center text-white font-bold"
                        style={{
                          position: "absolute",
                          width: "64px",
                          height: "64px",
                          background:
                            `linear-gradient(135deg, ${colors.main} 0%, ${colors.dark} 100%)`,
                          clipPath:
                            "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
                        }}
                      >
                        {ICON_COMPONENTS[badge.id]}
                      </div>

                      {/* Inner shine/highlight */}
                      <div
                        style={{
                          position: "absolute",
                          width: "64px",
                          height: "64px",
                          background:
                            `linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 50%)`,
                          clipPath:
                            "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)",
                        }}
                      />
                    </div>
                    <p className="text-xs text-center font-medium mt-2 max-w-16">
                      {badge.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
