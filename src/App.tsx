
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        console.log('App.tsx: Received message from Service Worker:', event.data);
        if (event.data && event.data.type === 'SYNC_SUCCESS_NOTIFICATION') {
          console.log('App.tsx: Showing toast for successful sync');
          toast({
            title: "Sync Successful",
            description: "Synchronizing your search for better results",
            duration: 3000,
          });
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      console.log('App.tsx: Added message listener for Service Worker messages');

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        console.log('App.tsx: Removed message listener for Service Worker messages');
      };
    }
  }, [toast]);

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
