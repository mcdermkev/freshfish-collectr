'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Info, CheckCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Feedback {
  id: string;
  created_at: string;
  user_id: string | null;
  type: string;
  content: string;
  page_url: string;
  status: string;
}

export default function FeedbackManager({ initialFeedback }: { initialFeedback: Feedback[] }) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setLoadingId(id);
    try {
      const { error } = await (supabase.from('beta_feedback') as any)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      toast.success(`Feedback marked as ${newStatus}`);
      router.refresh();
    } catch (error: any) {
      console.error('❌ Status Update Error:', error);
      toast.error('Failed to update status');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-indigo-500" />
        <h2 className="text-xl font-bold">Beta Feedback</h2>
        <Badge variant="secondary" className="ml-auto">{feedback.length} Submissions</Badge>
      </div>
      
      <div className="grid gap-4">
        {feedback.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            No feedback submitted yet.
          </Card>
        ) : (
          feedback.map((f) => (
            <Card key={f.id} className={`overflow-hidden border-border/50 hover:border-indigo-500/30 transition-all ${f.status === 'resolved' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className="flex">
                <div className={`w-1 ${f.status === 'resolved' ? 'bg-green-500' : (f.type === 'Bug' ? 'bg-rose-500' : 'bg-amber-500')}`} />
                <CardContent className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={f.type === 'Bug' ? 'destructive' : 'secondary'} className="text-[10px] uppercase h-5">
                          {f.type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(f.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className={`text-sm font-medium mt-2 ${f.status === 'resolved' ? 'line-through text-muted-foreground' : ''}`}>{f.content}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={f.status === 'resolved' ? 'default' : 'outline'} className={`text-[10px] ${f.status === 'resolved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-muted/30'}`}>
                        {f.status}
                      </Badge>
                      {f.status !== 'resolved' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px] gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
                          disabled={loadingId === f.id}
                          onClick={() => handleUpdateStatus(f.id, 'resolved')}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Resolve
                        </Button>
                      )}
                      {f.status === 'resolved' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px] gap-1.5 text-muted-foreground"
                          disabled={loadingId === f.id}
                          onClick={() => handleUpdateStatus(f.id, 'pending')}
                        >
                          <Clock className="w-3 h-3" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span className="truncate max-w-[250px]">URL: {f.page_url}</span>
                    </div>
                    {f.user_id ? (
                      <span>User ID: {f.user_id.split('-')[0]}...</span>
                    ) : (
                      <span>Anonymous User</span>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
