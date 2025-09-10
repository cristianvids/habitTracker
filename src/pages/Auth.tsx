import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if running in popup mode (either popup or new tab opened from widget)
  const isPopup = window.opener && window.opener !== window;

  // Handle authentication success in popup mode
  useEffect(() => {
    if (user && isPopup) {
      console.log('Auth page: User authenticated in popup mode, sending message to parent...');
      // Try multiple communication methods
      try {
        // Method 0: BroadcastChannel for cross-window communication without relying on opener
        if ('BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('auth');
            if (session?.access_token && session?.refresh_token) {
              bc.postMessage({
                type: 'AUTH_SESSION',
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              });
            }
            bc.postMessage({ type: 'AUTH_SUCCESS', user });
            bc.close();
          } catch (e) {
            console.error('BroadcastChannel post failed:', e);
          }
        }
        // Method 1: postMessage - include session tokens so the widget can set its own session
        if (session?.access_token && session?.refresh_token) {
          window.opener.postMessage({
            type: 'AUTH_SESSION',
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }, '*');
        }
        // Also send a generic success event for backward compatibility
        window.opener.postMessage({ type: 'AUTH_SUCCESS', user }, '*');
      } catch (error) {
        console.error('postMessage failed:', error);
      }
      
      // Method 2: localStorage (works across tabs/windows on same domain)
      try {
        localStorage.setItem('widget_auth_success', Date.now().toString());
      } catch (e) {
        // Ignore storage errors in restricted contexts
      }
      
      // Close popup after delay
      setTimeout(() => window.close(), 1000);
    } else if (user) {
      console.log('Auth page: User authenticated, redirecting...');
      navigate('/');
    }
  }, [user, session, navigate, isPopup]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
      // Send error message to parent if in popup
      if (isPopup) {
        window.opener.postMessage({ type: 'AUTH_ERROR', error: error.message }, '*');
      }
    } else {
      toast({
        title: "Success!",
        description: "You have been signed in successfully."
      });
      // Note: useEffect will handle navigation/popup closure
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Error signing up",
        description: error.message,
        variant: "destructive"
      });
      // Send error message to parent if in popup
      if (isPopup) {
        window.opener.postMessage({ type: 'AUTH_ERROR', error: error.message }, '*');
      }
    } else {
      toast({
        title: "Success!",
        description: "Check your email for the confirmation link."
      });
      // Send success message to parent if in popup
      if (isPopup) {
        window.opener.postMessage({ type: 'AUTH_SIGNUP_SUCCESS' }, '*');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Habit Tracker</CardTitle>
          <CardDescription>Sign in to track your habits</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}