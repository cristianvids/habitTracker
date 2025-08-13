import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Habit {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface HabitRecord {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  timestamp: string;
  user_id: string;
}

export interface DayRecord {
  [habitId: string]: {
    completed: boolean;
    timestamp: string;
  };
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<{ [date: string]: DayRecord }>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load habits and records
  useEffect(() => {
    if (user) {
      loadHabits();
      loadRecords();
    }
  }, [user]);

  const loadHabits = async () => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('Error loading habits:', error);
      toast({
        title: "Error loading habits",
        description: "Failed to load your habits. Please try again.",
        variant: "destructive"
      });
    }
  };

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('habit_records')
        .select('*');

      if (error) throw error;

      // Convert to the format expected by the app
      const recordsMap: { [date: string]: DayRecord } = {};
      data?.forEach((record) => {
        if (!recordsMap[record.date]) {
          recordsMap[record.date] = {};
        }
        recordsMap[record.date][record.habit_id] = {
          completed: record.completed,
          timestamp: record.timestamp
        };
      });

      setRecords(recordsMap);
    } catch (error) {
      console.error('Error loading records:', error);
      toast({
        title: "Error loading records",
        description: "Failed to load your habit records. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addHabit = async (name: string, color: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert([{ name, color, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setHabits(prev => [...prev, data]);
      toast({
        title: "Habit added",
        description: `"${name}" has been added to your habits.`
      });
    } catch (error) {
      console.error('Error adding habit:', error);
      toast({
        title: "Error adding habit",
        description: "Failed to add the habit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateHabit = async (id: string, name: string, color: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .update({ name, color })
        .eq('id', id);

      if (error) throw error;

      setHabits(prev => prev.map(habit => 
        habit.id === id ? { ...habit, name, color } : habit
      ));
      toast({
        title: "Habit updated",
        description: `"${name}" has been updated.`
      });
    } catch (error) {
      console.error('Error updating habit:', error);
      toast({
        title: "Error updating habit",
        description: "Failed to update the habit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHabits(prev => prev.filter(habit => habit.id !== id));
      // Remove records for this habit
      setRecords(prev => {
        const newRecords = { ...prev };
        Object.keys(newRecords).forEach(date => {
          delete newRecords[date][id];
        });
        return newRecords;
      });
      
      toast({
        title: "Habit deleted",
        description: "The habit has been deleted."
      });
    } catch (error) {
      console.error('Error deleting habit:', error);
      toast({
        title: "Error deleting habit",
        description: "Failed to delete the habit. Please try again.",
        variant: "destructive"
      });
    }
  };

  const saveDay = async (date: string, dayData: DayRecord) => {
    if (!user) return;

    try {
      // Delete existing records for this date
      await supabase
        .from('habit_records')
        .delete()
        .eq('date', date)
        .eq('user_id', user.id);

      // Insert new records
      const recordsToInsert = Object.entries(dayData).map(([habitId, data]) => ({
        habit_id: habitId,
        date,
        completed: data.completed,
        timestamp: data.timestamp,
        user_id: user.id
      }));

      if (recordsToInsert.length > 0) {
        const { error } = await supabase
          .from('habit_records')
          .insert(recordsToInsert);

        if (error) throw error;
      }

      setRecords(prev => ({ ...prev, [date]: dayData }));
    } catch (error) {
      console.error('Error saving day:', error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    habits,
    records,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    saveDay
  };
}