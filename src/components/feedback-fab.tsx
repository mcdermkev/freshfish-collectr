'use client';

import { useState } from 'react';
import { MessageSquare, Bug, Lightbulb, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function FeedbackFAB() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'Bug' | 'Feature'>('Bug');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await (supabase.from('beta_feedback') as any)
        .insert({
          user_id: user?.id,
          type,
          content: message,
          page_url: window.location.href,
        });

      if (error) throw error;
      
      toast.success('Feedback submitted! Thank you for helping us improve.');
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      console.error('❌ Feedback Submission Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      toast.error(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white pointer-events-auto transition-all hover:scale-110 active:scale-95 group"
          >
            <MessageSquare className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            <span className="sr-only">Feedback</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] pointer-events-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
                Beta Feedback
              </DialogTitle>
              <DialogDescription>
                Help us build the ultimate aquarium manager. Spotted a bug or have a brilliant idea? Let us know!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Feedback Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bug">
                      <div className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-rose-500" />
                        <span>Bug Report</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Feature">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span>Feature Request</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more..."
                  className="min-h-[120px] resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={loading || !message.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Sending...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
