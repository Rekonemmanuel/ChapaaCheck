import { motion } from "framer-motion";
import { ACHIEVEMENTS, EarnedAchievement, AchievementContext } from "@/lib/achievements";
import { Lock } from "lucide-react";

interface AchievementCardProps {
  context: AchievementContext;
}

const AchievementCard = ({ context }: AchievementCardProps) => {
  const earned = ACHIEVEMENTS.filter(a => a.check(context));
  const locked = ACHIEVEMENTS.filter(a => !a.check(context));
  const progress = Math.round((earned.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="rounded-xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Achievements</h3>
        <span className="text-xs font-medium text-muted-foreground">
          {earned.length}/{ACHIEVEMENTS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-primary"
        />
      </div>

      {/* Earned badges */}
      <div className="flex flex-wrap gap-2">
        {earned.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg cursor-default"
            title={`${a.title}: ${a.description}`}
          >
            {a.emoji}
            <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
              {a.title}
            </div>
          </motion.div>
        ))}
        {locked.slice(0, 4).map((a) => (
          <div
            key={a.id}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground/40"
            title={a.description}
          >
            <Lock className="h-3.5 w-3.5" />
          </div>
        ))}
        {locked.length > 4 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xs font-medium text-muted-foreground">
            +{locked.length - 4}
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementCard;
