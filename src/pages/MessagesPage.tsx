import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Bell, Inbox, Mail, MessageCircle, Phone, Search, Send, ShieldCheck } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { isValidMessageBody, MAX_MESSAGE_LENGTH } from "@/lib/messageValidation";
import { toast } from "sonner";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sender_name: string | null;
  recipient_name: string | null;
};

type Recipient = { user_id: string; display_name: string | null };

const messageTime = (value: string) => new Date(value).toLocaleString(undefined, {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

export default function MessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [adminRecipientMode, setAdminRecipientMode] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const loadMessages = useCallback(async (signedInId: string) => {
    const { data, error } = await supabase.rpc("get_patient_messages");
    if (error) {
      toast.error("Your messages could not be loaded.");
      setLoading(false);
      return;
    }
    setMessages((data ?? []) as Message[]);
    setUserId(signedInId);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data: role } = await supabase.rpc("current_user_has_role", { _role: "admin" });
      if (!active) return;
      setIsAdmin(role === true);
      await loadMessages(user.id);
    };
    void init();
    return () => { active = false; };
  }, [loadMessages]);

  useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => { void loadMessages(userId); }, 15000);
    return () => window.clearInterval(timer);
  }, [userId, loadMessages]);

  useEffect(() => {
    setRecipients([]);
    if (adminRecipientMode && !isAdmin) return;
    const query = adminRecipientMode ? "admin" : search.trim();
    if (query.length < 2) return;
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_message_recipients", {
        _query: query,
        _admins_only: adminRecipientMode,
      });
      if (!active) return;
      if (error) toast.error("Accounts could not be searched.");
      setRecipients((data ?? []) as Recipient[]);
      setSearching(false);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
      setSearching(false);
    };
  }, [search, adminRecipientMode, isAdmin]);

  useEffect(() => {
    let active = true;
    const loadPhone = async () => {
      setRecipientPhone(null);
      if (!isAdmin || !selectedRecipient) return;
      setPhoneLoading(true);
      const { data, error } = await supabase.rpc("get_message_recipient_phone", { _user_id: selectedRecipient.user_id });
      if (active) {
        setRecipientPhone(error ? null : data);
        setPhoneLoading(false);
      }
    };
    void loadPhone();
    return () => { active = false; };
  }, [isAdmin, selectedRecipient]);

  const unreadCount = useMemo(() => messages.filter((message) => message.recipient_id === userId && !message.read_at).length, [messages, userId]);
  const receivedMessages = useMemo(() => messages.filter((message) => message.recipient_id === userId), [messages, userId]);
  const sentMessages = useMemo(() => messages.filter((message) => message.sender_id === userId), [messages, userId]);

  const markRead = async (message: Message) => {
    if (message.recipient_id !== userId || message.read_at) return;
    const { error } = await supabase.rpc("mark_patient_message_read", { _message_id: message.id });
    if (error) {
      toast.error("This message could not be marked as read.");
      return;
    }
    const readAt = new Date().toISOString();
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, read_at: readAt } : item));
  };

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipient || !isValidMessageBody(body) || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("send_patient_message", {
      _recipient_id: selectedRecipient.user_id,
      _body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Your message could not be sent. Please try again.");
      return;
    }
    toast.success("Message sent.");
    setBody("");
    setSelectedRecipient(null);
    setSearch("");
    setRecipients([]);
    if (userId) await loadMessages(userId);
  };

  if (loading) {
    return <DashboardLayout><div role="status" className="health-card text-sm text-muted-foreground">Loading your messages…</div></DashboardLayout>;
  }

  if (!userId) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-xl space-y-5">
          <h1 className="text-2xl font-display font-bold">Messages</h1>
          <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Sign in to view messages</AlertTitle><AlertDescription>Private messages are available with a patient account.</AlertDescription></Alert>
          <Link to="/register?mode=signin"><Button>Patient sign in</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const renderMessage = (message: Message, direction: "received" | "sent") => {
    const otherName = direction === "received" ? message.sender_name : message.recipient_name;
    return (
      <article key={message.id} className="border-b py-4 last:border-b-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {direction === "received" ? <ArrowDownLeft className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">{direction === "received" ? "From" : "To"} {otherName || "MedAI account"}</span>
            {direction === "received" && !message.read_at && <><Badge>New</Badge><Button type="button" size="sm" variant="ghost" onClick={() => void markRead(message)}>Mark read</Button></>}
          </div>
          <time className="text-xs text-muted-foreground">{messageTime(message.created_at)}</time>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
      </article>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-display font-bold"><MessageCircle className="h-6 w-6 text-primary" /> Messages</h1>
            <p className="mt-1 text-sm text-muted-foreground">Private messages between MedAI accounts</p>
          </div>
          <Badge variant="secondary" className="gap-2"><Bell className="h-3.5 w-3.5" /> {unreadCount} unread</Badge>
        </div>

        <Alert><Mail className="h-4 w-4" /><AlertTitle>Email alerts are not configured</AlertTitle><AlertDescription>New messages appear here. Email alerts will be available after a sender domain is configured.</AlertDescription></Alert>

        <section className="health-card space-y-5">
          <div className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /><h2 className="font-display font-semibold">New message</h2></div>
          <div className="flex flex-wrap items-end gap-3">
            {isAdmin ? (
              <div className="space-y-1.5">
                <Label htmlFor="recipient-mode">Recipient group</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={!adminRecipientMode ? "default" : "outline"} onClick={() => { setAdminRecipientMode(false); setSelectedRecipient(null); setSearch(""); }}>Patients</Button>
                  <Button type="button" size="sm" variant={adminRecipientMode ? "default" : "outline"} onClick={() => { setAdminRecipientMode(true); setSelectedRecipient(null); setSearch(""); }}>Admins</Button>
                </div>
                <span id="recipient-mode" className="sr-only">Choose patients or admins</span>
              </div>
            ) : (
              <Button type="button" size="sm" variant={adminRecipientMode ? "default" : "outline"} onClick={() => { setAdminRecipientMode((current) => !current); setSelectedRecipient(null); setSearch(""); }}>
                <ShieldCheck className="mr-2 h-4 w-4" /> {adminRecipientMode ? "Choose a patient" : "Message Admin"}
              </Button>
            )}
          </div>

          {!selectedRecipient ? (
            <div className="space-y-2">
              <Label htmlFor="recipient-search">{adminRecipientMode ? "Admin account" : "Find an account by name or registered email"}</Label>
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="recipient-search" className="pl-9" value={search} disabled={adminRecipientMode} onChange={(event) => setSearch(event.target.value)} placeholder={adminRecipientMode ? "Searching admin accounts…" : "Type a name or full email address"} />
              </div>
              {searching && <p className="text-xs text-muted-foreground" role="status">Searching…</p>}
              {recipients.length > 0 && <ul className="max-w-xl divide-y rounded-md border" aria-label="Matching accounts">
                {recipients.map((recipient) => <li key={recipient.user_id} className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0 truncate text-sm">{recipient.display_name || "MedAI account"}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedRecipient(recipient); setRecipients([]); }}>Select</Button>
                </li>)}
              </ul>}
              {!adminRecipientMode && search.trim().length > 0 && search.trim().length < 2 && <p className="text-xs text-muted-foreground">Enter at least 2 characters.</p>}
              {!searching && search.trim().length >= 2 && recipients.length === 0 && <p className="text-sm text-muted-foreground">No matching accounts found.</p>}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
              <div><p className="text-xs text-muted-foreground">Sending to</p><p className="font-medium">{selectedRecipient.display_name || "MedAI account"}</p></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedRecipient(null); setRecipientPhone(null); }}>Change recipient</Button>
              {isAdmin && <div className="flex w-full items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                <Phone className="h-4 w-4 shrink-0" />
                {phoneLoading ? "Loading recipient phone…" : recipientPhone ? <><span><strong className="font-medium text-foreground">Admin-only phone:</strong> {recipientPhone}</span><a href={`tel:${recipientPhone}`} className="font-medium text-primary underline underline-offset-4">Call patient</a></> : "No phone number provided"}
              </div>}
            </div>
          )}

          {selectedRecipient && <form onSubmit={sendMessage} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="message-body">Message</Label><Textarea id="message-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} minLength={1} required placeholder="Write a private message…" /></div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{body.length}/{MAX_MESSAGE_LENGTH} characters</span>
              <Button type="submit" disabled={sending || !isValidMessageBody(body)} className="gap-2"><Send className="h-4 w-4" /> {sending ? "Sending…" : "Send message"}</Button>
            </div>
          </form>}
        </section>

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList><TabsTrigger value="inbox" className="gap-2"><Inbox className="h-4 w-4" /> Inbox {unreadCount > 0 && <Badge className="ml-1">{unreadCount}</Badge>}</TabsTrigger><TabsTrigger value="sent">Sent</TabsTrigger></TabsList>
          <TabsContent value="inbox"><section className="health-card">
            {receivedMessages.length === 0 ? <div className="py-8 text-center"><Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Your inbox is empty</p><p className="mt-1 text-sm text-muted-foreground">Messages sent to you will appear here.</p></div> : receivedMessages.map((message) => renderMessage(message, "received"))}
          </section></TabsContent>
          <TabsContent value="sent"><section className="health-card">
            {sentMessages.length === 0 ? <div className="py-8 text-center"><Send className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No sent messages</p><p className="mt-1 text-sm text-muted-foreground">Messages you send will appear here.</p></div> : sentMessages.map((message) => renderMessage(message, "sent"))}
          </section></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}