import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, X, Save } from "lucide-react";

interface Quote {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    document.title = "Manage Quotes — Touch Grass";
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserEmail(session.user.email ?? null);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      const adminFlag = !!roleData;
      setIsAdmin(adminFlag);

      const { data: quotesData, error } = await supabase
        .from("quotes")
        .select("id, text, author, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Failed to load quotes");
      } else {
        setQuotes(quotesData ?? []);
      }
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !newAuthor.trim()) return;
    const { data, error } = await supabase
      .from("quotes")
      .insert({ text: newText.trim(), author: newAuthor.trim() })
      .select("id, text, author, created_at")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuotes((prev) => [data, ...prev]);
    setNewText("");
    setNewAuthor("");
    toast.success("Quote added");
  };

  const startEdit = (q: Quote) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditAuthor(q.author);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditAuthor("");
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim() || !editAuthor.trim()) return;
    const { data, error } = await supabase
      .from("quotes")
      .update({ text: editText.trim(), author: editAuthor.trim() })
      .eq("id", id)
      .select("id, text, author, created_at")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuotes((prev) => prev.map((q) => (q.id === id ? data : q)));
    cancelEdit();
    toast.success("Quote updated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    toast.success("Quote deleted");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-8 space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Not an admin</h1>
          <p className="text-sm text-muted-foreground">
            Your account ({userEmail}) doesn't have admin access yet. To grant admin to this account, run this in the Cloud database SQL editor:
          </p>
          <pre className="text-xs bg-muted p-3 rounded text-left overflow-x-auto">
{`INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = '${userEmail}';`}
          </pre>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to grass</Link>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Manage Quotes</h1>
            <p className="text-sm text-muted-foreground">Signed in as {userEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/">View site</Link></Button>
            <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
          </div>
        </header>

        <Card className="p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> Add new quote</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-text">Quote</Label>
              <Textarea id="new-text" value={newText} onChange={(e) => setNewText(e.target.value)} rows={3} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-author">Author</Label>
              <Input id="new-author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} required />
            </div>
            <Button type="submit">Add quote</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">All quotes ({quotes.length})</h2>
          {quotes.map((q) => (
            <Card key={q.id} className="p-4">
              {editingId === q.id ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <Input value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(q.id)}><Save className="h-4 w-4 mr-1" /> Save</Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="italic">"{q.text}"</p>
                    <p className="text-sm text-muted-foreground mt-1">— {q.author}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(q)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Admin;
