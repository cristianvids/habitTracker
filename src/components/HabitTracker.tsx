import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, BarChart3, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';

const HABIT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function HabitTracker({ compact = false }: { compact?: boolean }) {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitColor, setNewHabitColor] = useState(HABIT_COLORS[0]);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { habits, records, loading, addHabit, updateHabit, deleteHabit, saveDay } = useHabits();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your habits...</p>
        </div>
      </div>
    );
  }

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      addHabit(newHabitName.trim(), newHabitColor);
      setNewHabitName('');
      setNewHabitColor(HABIT_COLORS[0]);
      setIsAddDialogOpen(false);
    }
  };

  const startEdit = (habit: any) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditColor(habit.color);
    setIsEditDialogOpen(true);
  };

  const saveEdit = () => {
    if (editingHabit && editName.trim()) {
      updateHabit(editingHabit.id, editName.trim(), editColor);
      setIsEditDialogOpen(false);
      setEditingHabit(null);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    deleteHabit(habitId);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully."
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const generateCalendarData = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    // Helper function to get local date string
    const getLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayString = getLocalDateString(today);
    
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = getLocalDateString(date);
      days.push({
        day,
        date: dateString,
        isToday: dateString === todayString,
        record: records[dateString] || {}
      });
    }
    
    return days;
  };

  const toggleHabit = (habitId: string, date: string) => {
    const currentRecord = records[date] || {};
    const isCompleted = currentRecord[habitId]?.completed || false;
    
    const updatedRecord = {
      ...currentRecord,
      [habitId]: {
        completed: !isCompleted,
        timestamp: new Date().toISOString()
      }
    };
    
    saveDay(date, updatedRecord);
  };

  const getCompletionRate = (dayRecord: any) => {
    if (habits.length === 0) return 0;
    const completedCount = habits.filter(habit => dayRecord[habit.id]?.completed).length;
    return Math.round((completedCount / habits.length) * 100);
  };

  const getDayTheme = (dayRecord: any) => {
    if (habits.length === 0) return '';
    const completionRate = getCompletionRate(dayRecord);
    if (completionRate === 100) return 'bg-yellow-500/20 border-yellow-500 text-yellow-700'; // Gold
    if (completionRate >= 50) return 'bg-gray-400/20 border-gray-400 text-gray-700'; // Silver
    if (completionRate > 0) return 'bg-red-500/20 border-red-500 text-red-700'; // Failed
    return '';
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const toggleTodayHabit = (habitId: string) => {
    const today = getTodayDate();
    toggleHabit(habitId, today);
  };

  const calendarData = generateCalendarData();

  return (
    <div className={compact ? "bg-background p-2 pt-4" : "min-h-screen bg-background p-4 md:p-8"}>
      <div className={compact ? "mx-auto space-y-3" : "max-w-6xl mx-auto space-y-8"}>
        {/* Header */}
        <div className={compact ? "flex items-center justify-between gap-2" : "flex items-center justify-between"}>
          <div className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}>
            <Calendar className={compact ? "h-4 w-4 text-primary" : "h-5 w-5 text-primary"} />
            <h1 className={compact ? "text-base font-semibold" : "text-2xl font-bold"}>Habit Tracker</h1>
          </div>
          <div className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}>
            {!compact && (
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.email}
              </span>
            )}
            {!compact && (
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className={compact ? "h-8 px-2" : undefined}>
                  <Plus className={compact ? "h-4 w-4" : "h-4 w-4 mr-2"} />
                  {!compact && 'Add Habit'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{compact ? 'Add Habit' : 'Add New Habit'}</DialogTitle>
                </DialogHeader>
                <div className={compact ? "space-y-3" : "space-y-4"}>
                  <div>
                    <Label htmlFor="habit-name">Habit Name</Label>
                    <Input
                      id="habit-name"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="Enter habit name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="habit-color">Color</Label>
                    <div className="flex gap-2 mt-2">
                      {HABIT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewHabitColor(color)}
                          className={`w-5 h-5 rounded-full ${newHabitColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddHabit} className="w-full">
                    Add Habit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {compact && (
              <Link to="/analytics">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {!compact && (
              <Link to="/analytics">
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Habits List */}
        <Card className={compact ? "bg-[#262626]" : undefined}>
          <CardHeader className={compact ? "p-3" : undefined}>
            <CardTitle className={compact ? "text-sm" : undefined}>Your Habits</CardTitle>
          </CardHeader>
          <CardContent className={compact ? "p-3 pt-0" : undefined}>
            {habits.length === 0 ? (
              <div className={compact ? "text-center py-4 text-muted-foreground text-sm" : "text-center py-8 text-muted-foreground"}>
                <p>{compact ? 'No habits yet.' : 'No habits yet. Add your first habit to get started!'}</p>
              </div>
            ) : (
              <div className={compact ? "space-y-2" : "space-y-3"}>
                 {habits.map((habit) => {
                   const todayRecord = records[getTodayDate()] || {};
                   const isCompletedToday = todayRecord[habit.id]?.completed || false;
                   
                   return (
                     <div key={habit.id} className={compact ? "flex items-center justify-between p-2 rounded-md bg-[#1f1f1f] border border-border" : "flex items-center justify-between p-3 rounded-lg bg-[#1f1f1f] border border-border"}>
                       <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
                         <div
                           className={compact ? "w-3 h-3 rounded-full" : "w-4 h-4 rounded-full"}
                           style={{ backgroundColor: habit.color }}
                         />
                         <span className={compact ? "font-medium text-sm" : "font-medium"}>{habit.name}</span>
                       </div>
                       <div className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}>
                         <Button
                           variant={isCompletedToday ? "default" : "outline"}
                           size="sm"
                           onClick={() => toggleTodayHabit(habit.id)}
                           className={(isCompletedToday ? "bg-green-600 hover:bg-green-700 " : "") + (compact ? "h-8 px-2 text-xs" : "")}
                         >
                           {compact ? (isCompletedToday ? "Done" : "Do") : (isCompletedToday ? "Completed" : "Complete")}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => startEdit(habit)}
                           className={compact ? "h-8 w-8 p-0" : undefined}
                         >
                           <Edit2 className={compact ? "h-4 w-4" : "h-4 w-4"} />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleDeleteHabit(habit.id)}
                           className={(compact ? "h-8 w-8 p-0 " : "") + "text-destructive hover:text-destructive"}
                         >
                           <Trash2 className={compact ? "h-4 w-4" : "h-4 w-4"} />
                         </Button>
                       </div>
                     </div>
                   );
                 })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        {habits.length > 0 && (
          <Card className={compact ? "bg-[#262626]" : undefined}>
            <CardHeader className={compact ? "p-3" : undefined}>
              <CardTitle className={compact ? "text-sm" : undefined}>This Month</CardTitle>
            </CardHeader>
            <CardContent className={compact ? "p-3 pt-0" : undefined}>
              <div className={compact ? "grid grid-cols-7 gap-1" : "grid grid-cols-7 gap-2"}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className={compact ? "text-center text-xs font-medium text-muted-foreground p-1" : "text-center text-sm font-medium text-muted-foreground p-2"}>
                    {day}
                  </div>
                ))}
                 {calendarData.map((day) => {
                   const dayTheme = getDayTheme(day.record);
                   const baseClasses = day.isToday ? 'bg-primary/10 border-primary' : 'border-border';
                   const themeClasses = dayTheme || baseClasses;
                   
                   return (
                     <div
                       key={day.date}
                       className={`${compact ? 'p-1 rounded-md bg-[#1f1f1f]' : 'p-2 rounded-lg bg-[#1f1f1f]'} border ${themeClasses}`}
                     >
                    <div className={compact ? "text-xs font-medium mb-1" : "text-sm font-medium mb-2"}>{day.day}</div>
                    <div className={compact ? "space-y-0.5" : "space-y-1"}>
                      {habits.map((habit) => {
                        const isCompleted = day.record[habit.id]?.completed || false;
                        return (
                          <button
                            key={habit.id}
                            onClick={() => toggleHabit(habit.id, day.date)}
                            className={`w-full ${compact ? 'h-1.5' : 'h-2'} rounded-full ${
                              isCompleted 
                                ? 'opacity-100' 
                                : 'opacity-30 hover:opacity-50'
                            }`}
                            style={{ backgroundColor: habit.color }}
                          />
                        );
                      })}
                    </div>
                    {!compact && Object.keys(day.record).length > 0 && (
                      <div className="text-xs text-center mt-1 text-muted-foreground">
                        {getCompletionRate(day.record)}%
                      </div>
                    )}
                    </div>
                   );
                 })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Habit</DialogTitle>
            </DialogHeader>
            <div className={compact ? "space-y-3" : "space-y-4"}>
              <div>
                <Label htmlFor="edit-name">Habit Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter habit name"
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex gap-2 mt-2">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={`w-5 h-5 rounded-full ${editColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={saveEdit} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}