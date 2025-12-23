import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SearchSection({ searchQuery, onSearchChange }: SearchSectionProps) {
  return (
    <div className="mb-8 flex justify-center">
      <div className="relative max-w-xl w-full">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by character or anime..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}