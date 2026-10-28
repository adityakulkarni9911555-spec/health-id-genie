import { Component, type ReactNode } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Suspense handles pending imports, but rejected imports need a boundary.
export class PageLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-4" role="alert">
          <WifiOff className="w-8 h-8 text-muted-foreground mx-auto" />
          <h1 className="font-display text-xl font-bold text-foreground">Medora couldn’t open this page</h1>
          <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()} className="min-h-14 gap-2"><RefreshCw className="w-4 h-4" />Try again</Button>
        </div>
      </main>
    );
  }
}