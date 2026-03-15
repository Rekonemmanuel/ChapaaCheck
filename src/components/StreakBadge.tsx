import { Flame } from "lucide-react";
import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge = ({ streak }: StreakBadgeProps) => {
  if (streak < 1) return null;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-accent-foreground"
    >
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
      >
        <Flame className="h-4 w-4 text-accent" />
      </motion.div>
      <span className="text-xs font-bold">{streak} day streak</span>
    </motion.div>
  );
};

export default StreakBadge;
