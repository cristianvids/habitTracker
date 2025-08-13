import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Target, Calendar, Award, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useHabits } from '@/hooks/useHabits';
import { 
  getFilteredRecords, 
  calculateStreaks, 
  getCompletionTrends, 
  getWeeklyPatterns, 
  getMonthlyPatterns,
  getOverallStats,
  type DayRecord 
} from '@/lib/analytics';

const Analytics = () => {
  const [activeTab, setActiveTab] = useState('1month');
  const navigate = useNavigate();
  const { habits, records, loading } = useHabits();

  // Convert Supabase records format to analytics format
  const convertToAnalyticsFormat = (): DayRecord[] => {
    console.log('Raw Supabase records:', records);
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
      
      let achievement: 'gold' | 'silver' | 'bronze' | 'failed';
      if (completionRate === 100) achievement = 'gold';
      else if (completionRate >= 50) achievement = 'silver';
      else if (completionRate > 0) achievement = 'bronze';
      else achievement = 'failed';

      console.log(`Date: ${date}, Completed: ${completedCount}/${totalHabits} (${completionRate}%) - ${achievement}`);

      return {
        date,
        completionRate,
        achievement,
        habits: dayHabits
      };
    });
    
    console.log('Converted analytics records:', analyticsRecords);
    return analyticsRecords;
  };

  const analyticsRecords = convertToAnalyticsFormat();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const filteredRecords = getFilteredRecords(analyticsRecords, activeTab as '1month' | '6months' | '1year');
  const streaks = calculateStreaks(filteredRecords);
  const trends = getCompletionTrends(filteredRecords);
  const weeklyPatterns = getWeeklyPatterns(filteredRecords);
  const monthlyPatterns = getMonthlyPatterns(filteredRecords);
  const overallStats = getOverallStats(filteredRecords);

  const getAchievementColor = (achievement: string) => {
    switch (achievement) {
      case 'gold': return 'hsl(45, 100%, 60%)';
      case 'silver': return 'hsl(0, 0%, 75%)';
      case 'bronze': return 'hsl(30, 100%, 50%)';
      case 'failed': return 'hsl(0, 84%, 60%)';
      default: return 'hsl(var(--primary))';
    }
  };

  const getAchievementBadgeVariant = (achievement: string) => {
    switch (achievement) {
      case 'gold': return 'default';
      case 'silver': return 'secondary';
      case 'bronze': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Habits
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1month">Last Month</TabsTrigger>
          <TabsTrigger value="6months">6 Months</TabsTrigger>
          <TabsTrigger value="1year">1 Year</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Days</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalDays}</div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.averageCompletion.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gold Days</CardTitle>
                <Award className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{overallStats.goldDays}</div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Days</CardTitle>
                <Award className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{overallStats.failedDays}</div>
              </CardContent>
            </Card>
          </div>

          {/* Completion Trends */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Completion Rate Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completionRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Habit Streaks */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Habit Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {streaks.length > 0 ? (
                <div className="space-y-4">
                  {streaks.map((streak) => (
                    <div key={streak.habitId} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                      <div>
                        <h4 className="font-medium">{streak.habitName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Current: {streak.currentStreak} days | Longest: {streak.longestStreak} days
                        </p>
                      </div>
                      <Badge variant={streak.currentStreak > 0 ? 'default' : 'secondary'}>
                        {streak.currentStreak > 0 ? 'Active' : 'Broken'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No streak data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Weekly Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyPatterns.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyPatterns}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="dayName" 
                        stroke="hsl(var(--foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="averageCompletion" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No weekly pattern data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievement Distribution */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Achievement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      Gold Days
                    </span>
                    <Badge variant={getAchievementBadgeVariant('gold')}>
                      {overallStats.goldDays}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      Silver Days
                    </span>
                    <Badge variant={getAchievementBadgeVariant('silver')}>
                      {overallStats.silverDays}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      Bronze Days
                    </span>
                    <Badge variant={getAchievementBadgeVariant('bronze')}>
                      {overallStats.bronzeDays}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      Failed Days
                    </span>
                    <Badge variant={getAchievementBadgeVariant('failed')}>
                      {overallStats.failedDays}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;