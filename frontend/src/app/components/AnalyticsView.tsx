import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiFetch, ApiError } from '../../lib/api';
import type { AnalyticsSummary, User } from '../../lib/types';

interface AnalyticsViewProps {
  user: User;
}

const COLORS = ['#00ff88', '#ff8800', '#00ccff', '#ff4488'];

export default function AnalyticsView({ user }: AnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (user.role !== 'manager' && user.role !== 'admin') return;
    apiFetch<AnalyticsSummary>('/api/analytics/summary')
      .then(setData)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Failed to load analytics'));
  }, [user.role]);

  if (user.role !== 'manager' && user.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="border-2 border-primary p-12 text-center text-muted-foreground">
          MANAGER ACCESS ONLY
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border-2 border-dashed border-primary/30 p-12 text-center text-muted-foreground">
        LOADING ANALYTICS...
      </div>
    );
  }

  const statusData = Object.entries(data.byStatus).map(([status, count]) => ({
    status: status.replace('_', ' '),
    count,
  }));

  const teamData = Object.entries(data.byTeam).map(([team, statuses]) => ({
    team: team.toUpperCase(),
    total: Object.values(statuses).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="h-full flex flex-col gap-6">
      <h2 className="text-3xl tracking-wider">[ ANALYTICS ]</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border-2 border-primary p-4 bg-card">
          <div className="text-xs text-muted-foreground">TOTAL TASKS</div>
          <div className="text-3xl text-accent">{data.totalTasks}</div>
        </div>
        <div className="border-2 border-destructive p-4 bg-card">
          <div className="text-xs text-muted-foreground">OVERDUE</div>
          <div className="text-3xl text-destructive">{data.overdue}</div>
        </div>
        <div className="border-2 border-accent p-4 bg-card">
          <div className="text-xs text-muted-foreground">DONE</div>
          <div className="text-3xl text-accent">{data.byStatus.done}</div>
        </div>
        <div className="border-2 border-chart-3 p-4 bg-card">
          <div className="text-xs text-muted-foreground">IN PROGRESS</div>
          <div className="text-3xl text-chart-3">{data.byStatus.in_progress}</div>
        </div>
      </div>

      <div className="border-2 border-primary/30 p-4 bg-card flex-1 min-h-[300px]">
        <div className="text-sm mb-4 text-muted-foreground">TASKS BY TEAM</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={teamData}>
            <XAxis dataKey="team" stroke="#00ff88" />
            <YAxis stroke="#00ff88" />
            <Tooltip contentStyle={{ background: '#0a0e14', border: '1px solid #00ff88' }} />
            <Bar dataKey="total">
              {teamData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border-2 border-primary/30 p-4 bg-card">
        <div className="text-sm mb-4 text-muted-foreground">BY STATUS</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={statusData}>
            <XAxis dataKey="status" stroke="#00ff88" />
            <YAxis stroke="#00ff88" />
            <Bar dataKey="count" fill="#00ff88" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
