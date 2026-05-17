import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, trendUp, className, bgColor }) {
  return (
    <div className={cn(
      "bg-white p-6 border-r border-indigo-200 last:border-r-0",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && (
            <p className={cn(
              "text-sm mt-2 font-medium",
              trendUp ? "text-emerald-600" : "text-rose-600"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-xl", bgColor || "bg-gradient-to-br from-indigo-50 to-violet-50")}>
            <Icon className="w-6 h-6 text-indigo-600" />
          </div>
        )}
      </div>
    </div>
  );
}