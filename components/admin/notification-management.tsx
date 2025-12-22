"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Users, User, MessageSquare } from "lucide-react";

export function NotificationManagement() {
  const { users, sendNotification } = useStore();
  const { toast } = useToast();

  const [notificationType, setNotificationType] = useState<
    "admin_message" | "system"
  >("admin_message");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);

  const handleSendNotification = (
    type?: "admin_message" | "system",
    forceAllUsers = false
  ) => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter both title and message.",
        variant: "destructive",
      });
      return;
    }

    const recipients =
      forceAllUsers || sendToAll ? users.map((u) => u.id) : targetUsers;

    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please select recipients or send to all users.",
        variant: "destructive",
      });
      return;
    }

    recipients.forEach((userId) => {
      sendNotification(userId, type || notificationType, title, message);
    });

    toast({
      title: "Notifications Sent",
      description: `Sent to ${recipients.length} user${
        recipients.length !== 1 ? "s" : ""
      }`,
    });

    // Reset form
    setTitle("");
    setMessage("");
    setTargetUsers([]);
    setSendToAll(false);
  };

  const addUser = (userId: string) => {
    if (!targetUsers.includes(userId)) {
      setTargetUsers([...targetUsers, userId]);
    }
  };

  const removeUser = (userId: string) => {
    setTargetUsers(targetUsers.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Message Center</h3>
        <p className="text-sm text-muted-foreground">
          Send messages and notifications to users
        </p>
      </div>

      <Tabs defaultValue="broadcast" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcast">
            <Users className="h-4 w-4 mr-2" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger value="individual">
            <User className="h-4 w-4 mr-2" />
            Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Broadcast Message
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Send an important message to all users that will appear
                prominently.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="broadcast-title">Title</Label>
                <Input
                  id="broadcast-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Market Maintenance Tonight"
                />
              </div>
              <div>
                <Label htmlFor="broadcast-message">Message</Label>
                <Textarea
                  id="broadcast-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your important message to all users..."
                  rows={4}
                />
              </div>
              <Button
                onClick={() => handleSendNotification("admin_message", true)}
                className="w-full"
                disabled={!title.trim() || !message.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Send Individual Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="type">Notification Type</Label>
                <Select
                  value={notificationType}
                  onValueChange={(value: any) => setNotificationType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_message">Admin Message</SelectItem>
                    <SelectItem value="system">System Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="individual-title">Title</Label>
                <Input
                  id="individual-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>

              <div>
                <Label htmlFor="individual-message">Message</Label>
                <Textarea
                  id="individual-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your message..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendToAll"
                    checked={sendToAll}
                    onChange={(e) => setSendToAll(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sendToAll">Send to all users</Label>
                </div>

                {!sendToAll && (
                  <div>
                    <Label>Target Users</Label>
                    <Select
                      value=""
                      onValueChange={(userId: string) => {
                        if (!targetUsers.includes(userId)) {
                          setTargetUsers([...targetUsers, userId]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add users to notify" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => !targetUsers.includes(u.id))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.username} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {targetUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {targetUsers.map((userId) => {
                          const user = users.find((u) => u.id === userId);
                          return (
                            <Badge
                              key={userId}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              <User className="h-3 w-3" />
                              {user?.username}
                              <button
                                onClick={() => removeUser(userId)}
                                className="ml-1 text-xs hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleSendNotification()}
                className="w-full"
                disabled={
                  !title.trim() ||
                  !message.trim() ||
                  (!sendToAll && targetUsers.length === 0)
                }
              >
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Notification Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType("system");
                setTitle("Market Update");
                setMessage(
                  "The market has been updated. Check your portfolio for changes."
                );
                setSendToAll(true);
              }}
            >
              Market Update
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType("admin_message");
                setTitle("Maintenance Notice");
                setMessage(
                  "The platform will be undergoing maintenance in 1 hour. Trading will be temporarily unavailable."
                );
                setSendToAll(true);
              }}
            >
              Maintenance Notice
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType("admin_message");
                setTitle("New Features");
                setMessage(
                  "New features have been added to the platform! Check them out in your dashboard."
                );
                setSendToAll(true);
              }}
            >
              New Features
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotificationType("system");
                setTitle("Account Security");
                setMessage(
                  "Please update your password regularly to keep your account secure."
                );
                setSendToAll(true);
              }}
            >
              Security Reminder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
