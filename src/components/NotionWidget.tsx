import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { HabitTracker } from "@/components/HabitTracker";

const NotionWidget = () => {
  const { user, loading } = useAuth();
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
    const authUrl = `/auth?source=widget&returnTo=%2Fwidget`;

    // Detect Notion desktop app or environments that block popups, fall back to in-embed auth
    const ua = navigator.userAgent || '';
    const isNotionApp = ua.includes('Notion');
    if (isNotionApp) {
      console.log('Detected Notion app, using in-embed auth flow');
      window.location.href = `/auth?embedded=1&source=widget&returnTo=%2Fwidget`;
      return;
    }
    const popup = window.open(authUrl, 'auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    setAuthPopup(popup);
    
    // Check if popup was blocked or null
    if (!popup || popup.closed) {
      console.log('Popup blocked, opening in new tab...');
      // Fallback: open in new tab, but still listen for messages
      const newTab = window.open(authUrl, '_blank');
      setAuthPopup(newTab);
      // If still blocked, do in-embed as a last resort
      if (!newTab || newTab.closed) {
        console.log('New tab also blocked, using in-embed auth flow');
        window.location.href = `/auth?embedded=1&source=widget&returnTo=%2Fwidget`;
      }
    } else {
      console.log('Popup opened successfully');
    }
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-card flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-48 bg-card flex items-center justify-center p-2">
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">Please sign in to view your habits</p>
          <Button size="sm" onClick={openAuthPopup}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }
  return (
    <HabitTracker compact />
  );
};

export default NotionWidget;