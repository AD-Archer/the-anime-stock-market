"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const updateTheme = useStore((s) => s.updateTheme);
  const currentUser = useStore((s) => s.currentUser);
  const { toast } = useToast();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // If the logged-in user has a saved theme, apply it once we mount
  useEffect(() => {
    if (!mounted) return;
    if (currentUser?.theme) {
      setTheme(currentUser.theme as "light" | "dark" | "system");
    }
  }, [mounted, currentUser?.theme, setTheme]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const onSelect = async (selected: "light" | "dark" | "system") => {
    setTheme(selected);
    // persist preference if user is logged in
    try {
      const ok = await updateTheme(selected);
      if (ok) {
        toast({
          title: "Theme saved",
          description: `Saved ${selected} to your profile`,
        });
      } else {
        toast({ title: "Theme set", description: "Applied locally" });
      }
    } catch (e) {
      // fail silently
      console.warn("Failed to persist theme preference", e);
      toast({ title: "Theme set", description: "Applied locally" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelect("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
