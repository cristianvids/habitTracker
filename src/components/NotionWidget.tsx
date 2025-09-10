import { useAuth } from "@/hooks/useAuth";
import { useHabits } from "@/hooks/useHabits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getFilteredRecords, getCompletionTrends } from "@/lib/analytics";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NotionWidget = () => {
  const { user, loading } = useAuth();
  const { habits, records, saveDay } = useHabits();
  const [authPopup, setAuthPopup] = useState<Window | null>(null);

  // Listen for authentication using multiple methods
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('Widget received postMessage:', event.data);

      // Accept messages only from our opened auth popup (safer than strict-origin in multi-domain setups)
      if (authPopup && event.source !== authPopup) {
        return;
      }

      // Preferred: receive tokens and set session directly (works even with partitioned storage)
      if (event.data?.type === 'AUTH_SESSION' && event.data.access_token && event.data.refresh_token) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: event.data.access_token,
            refresh_token: event.data.refresh_token,
          });
          if (error) {
            console.error('Failed to set session in widget:', error);
          } else {
            console.log('Session set in widget:', data?.session?.user?.id);
          }
        } catch (e) {
          console.error('Error calling setSession in widget:', e);
        }
        // Close popup if still open
        try {
          if (authPopup && !authPopup.closed) authPopup.close();
        } catch {}
        return;
      }
      
      // Backward compatibility: generic success event
      if (event.data.type === 'AUTH_SUCCESS') {
        console.log('Auth success received via postMessage, reloading widget...');
        window.location.reload();
      }
    };

    // Method 1: Listen for postMessage
    window.addEventListener('message', handleMessage);

    // Method 1b: Listen via BroadcastChannel if available
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('auth');
        bc.onmessage = async (event: MessageEvent) => {
          const data = (event as unknown as MessageEvent).data as any;
          console.log('Widget received BroadcastChannel message:', data);
          if (data?.type === 'AUTH_SESSION' && data.access_token && data.refresh_token) {
            try {
              const { error } = await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
              });
              if (error) {
                console.error('Failed to set session via BroadcastChannel:', error);
              }
            } catch (e) {
              console.error('Error calling setSession via BroadcastChannel:', e);
            }
            try {
              if (authPopup && !authPopup.closed) authPopup.close();
            } catch {}
            return;
          }
          if (data?.type === 'AUTH_SUCCESS') {
            window.location.reload();
          }
        };
      } catch (e) {
        console.error('BroadcastChannel setup failed:', e);
      }
    }

    // Method 2: Poll localStorage for auth success
    const checkAuthSuccess = () => {
      const authSuccess = localStorage.getItem('widget_auth_success');
      if (authSuccess) {
        console.log('Auth success detected via localStorage, reloading widget...');
        localStorage.removeItem('widget_auth_success');
        window.location.reload();
      }
    };

    // Poll every 1 second when popup is open
    let pollInterval: NodeJS.Timeout | null = null;
    if (authPopup) {
      pollInterval = setInterval(checkAuthSuccess, 1000);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [authPopup]);

  const openAuthPopup = () => {
    console.log('Opening auth popup...');
    const authUrl = `/auth?source=widget`;
    const popup = window.open(authUrl, 'auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    setAuthPopup(popup);
    
    // Check if popup was blocked or null
    if (!popup || popup.closed) {
      console.log('Popup blocked, opening in new tab...');
      // Fallback: open in new tab, but still listen for messages
      const newTab = window.open(authUrl, '_blank');
      setAuthPopup(newTab);
    } else {
      console.log('Popup opened successfully');
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-card flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-96 bg-card flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Please sign in to view your habits</p>
          <Button size="sm" onClick={openAuthPopup}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = records[today] || {};

  const toggleHabit = async (habitId: string) => {
    const currentStatus = todayRecord[habitId]?.completed || false;
    const updatedRecord = {
      ...todayRecord,
      [habitId]: { 
        completed: !currentStatus,
        timestamp: new Date().toISOString()
      }
    };
    
    await saveDay(today, updatedRecord);
  };

  // Convert records to analytics format
  const convertToAnalyticsFormat = () => {
    console.log('Converting records for analytics:', records);
    console.log('Available habits:', habits);
    
    const analyticsRecords = Object.entries(records).map(([date, dayRecord]) => {
      // Create a complete list of habits for this day, including non-tracked ones
      const dayHabits = habits.map(habit => {
        const record = dayRecord[habit.id];
        return {
          id: habit.id,
          name: habit.name,
          completed: record?.completed || false
        };
      });

      const completedCount = dayHabits.filter(h => h.completed).length;
      const totalHabits = dayHabits.length;
      const completionRate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      let achievement: 'gold' | 'silver' | 'bronze' | 'failed' = 'failed';
      if (completionRate === 100) achievement = 'gold';
      else if (completionRate >= 75) achievement = 'silver';
      else if (completionRate >= 50) achievement = 'bronze';
      else if (completionRate > 0) achievement = 'bronze';
      else achievement = 'failed';

      return {
        date,
        habits: dayHabits,
        completionRate,
        achievement,
        completedCount,
        totalHabits
      };
    });

    return analyticsRecords;
  };

  const analyticsData = convertToAnalyticsFormat();
  const filteredRecords = getFilteredRecords(analyticsData, '1month');
  const trends = getCompletionTrends(filteredRecords);

  const chartData = trends.map(trend => ({
    date: format(new Date(trend.date), 'MMM d'),
    completion: trend.completionRate
  }));

  const chartConfig = {
    completion: {
      label: "Completion Rate",
      color: "hsl(var(--primary))",
    },
  };

  const todayHabits = habits.map(habit => ({
    ...habit,
    completed: todayRecord[habit.id]?.completed || false
  }));

  const completedToday = todayHabits.filter(h => h.completed).length;
  const totalToday = todayHabits.length;
  const todayCompletionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-background p-4 space-y-4">
      {/* Today's Non-Negotiables */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today's Non-Negotiables</CardTitle>
            <Badge variant="outline" className="text-xs">
              {completedToday}/{totalToday} ({todayCompletionRate}%)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No habits set up yet
            </p>
          ) : (
            todayHabits.map((habit) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => toggleHabit(habit.id)}
              >
                {habit.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <span 
                  className={`flex-1 text-sm ${
                    habit.completed ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {habit.name}
                </span>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: habit.color }}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Progress Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg">30-Day Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              No data available yet
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="completion"
                    stroke="var(--color-completion)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotionWidget;