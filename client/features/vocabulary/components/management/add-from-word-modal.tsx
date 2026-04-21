"use client";

import React, { useState } from "react";
import { Search, BookOpen, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAddCardFromWord } from "../../api/use-management";
import { Word } from "../../schemas";

interface AddFromWordModalProps {
  deckId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

// Mock data for demonstration - in real app, this would come from API
const MOCK_WORDS: Word[] = [
  {
    id: "1",
    word: "abundant",
    phonetic: "/əˈbʌn.dənt/",
    audioUrl: null,
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "có nhiều, dồi dào, phong phú",
            example: "The region has abundant natural resources.",
            synonyms: ["plentiful", "copious", "ample"],
            antonyms: ["scarce", "limited"],
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    word: "benevolent",
    phonetic: "/bəˈnev.əl.ənt/",
    audioUrl: null,
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "tốt bụng, nhân từ",
            example: "He was a benevolent ruler.",
            synonyms: ["kind", "charitable", "generous"],
            antonyms: ["malevolent", "cruel"],
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    word: "candid",
    phonetic: "/ˈkæn.dɪd/",
    audioUrl: null,
    meanings: [
      {
        partOfSpeech: "adjective",
        definitions: [
          {
            definition: "thẳng thắn, chân thật",
            example: "She was candid about her mistakes.",
            synonyms: ["frank", "outspoken", "honest"],
            antonyms: ["evasive", "deceptive"],
          },
        ],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const AddFromWordModal = ({ deckId, trigger, onSuccess }: AddFromWordModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  const { mutate: addCardFromWord, isPending } = useAddCardFromWord();

  const filteredWords = MOCK_WORDS.filter(
    (word) =>
      word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      word.meanings.some((meaning) =>
        meaning.definitions.some((def) => def.definition.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
  );

  const handleAddCard = () => {
    if (!selectedWord) return;

    addCardFromWord(
      { deckId, data: { wordId: selectedWord.id } },
      {
        onSuccess: () => {
          setIsOpen(false);
          setSelectedWord(null);
          setSearchQuery("");
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Thêm từ có sẵn
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Thêm thẻ từ từ có sẵn
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm từ vựng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Word Selection Area */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Word List */}
            <div className="overflow-y-auto pr-2">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Danh sách từ</h3>
              <div className="space-y-2">
                {filteredWords.map((word) => (
                  <Card
                    key={word.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedWord?.id === word.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedWord(word)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{word.word}</h4>
                          <p className="text-sm text-muted-foreground font-mono">{word.phonetic}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {word.meanings[0]?.partOfSpeech}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">{word.meanings[0]?.definitions[0]?.definition}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Word Preview */}
            <div className="overflow-y-auto pr-2">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Xem trước</h3>
              {selectedWord ? (
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-2xl">{selectedWord.word}</h4>
                        <p className="text-lg text-muted-foreground font-mono">{selectedWord.phonetic}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedWord(null)} className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {selectedWord.meanings.map((meaning, idx) => (
                        <div key={idx} className="space-y-2">
                          <Badge variant="secondary" className="text-xs">
                            {meaning.partOfSpeech}
                          </Badge>
                          {meaning.definitions.map((def, defIdx) => (
                            <div key={defIdx} className="pl-2 border-l-2 border-border">
                              <p className="text-sm">{def.definition}</p>
                              {def.example && (
                                <p className="text-sm text-muted-foreground italic mt-1">&quot;{def.example}&quot;</p>
                              )}
                              {def.synonyms.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">Từ đồng nghĩa: </span>
                                  <span className="text-xs">{def.synonyms.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">Chọn một từ để xem chi tiết</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setSelectedWord(null);
              setSearchQuery("");
            }}>
            Hủy
          </Button>
          <Button onClick={handleAddCard} disabled={!selectedWord || isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Thêm vào bộ thẻ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
