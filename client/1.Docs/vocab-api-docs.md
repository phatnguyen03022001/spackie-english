# Vocab API - Complete Frontend/Backend Flow

## 📋 Tổng Quan Kiến Trúc

```
Frontend (NextJS) → Backend (NestJS)
├── 1️⃣ SM-2 Logic: Frontend xử lý (tính interval, easeFactor, rating)
├── 2️⃣ User Action: Frontend capture user interactions & ratings
├── 3️⃣ JSON Aggregation: Frontend tổng hợp session results
└── 4️⃣ Sync: Frontend gửi JSON -> Backend xử lý DB + stats
```

**Nguyên tắc chính:**
- ✅ **Frontend**: UI interaction, SM-2 calculation, local state, JSON preparation
- ✅ **Backend**: Data persistence, stats aggregation, validation, business logic
- ✅ **No replication**: Frontend tính SM-2 once, Backend không tính lại

---

## 🎓 Management APIs (Teacher/Admin)

### 1️⃣ Create Deck
📍 **API:** `POST /management/vocab/decks`

#### Frontend Task
```typescript
// features/vocabulary/api/use-management.ts
async function createDeck(createDeckDto: CreateDeckDto) {
  // 1. Form validation (Zod schema)
  // 2. Call API
  // 3. Handle loading state, toast feedback
}
```
- **Collect**: title, description, isPublic, levelTag từ form
- **Validate**: Zod schema `CreateDeckSchema`
- **UI Feedback**: Loading spinner, toast notification (success/error)
- **Cache Update**: Invalidate "myDecks" query để refresh list

#### Backend Task
```typescript
// src/modules/vocab/services/management.service.ts
async createDeck(userId: string, dto: CreateDeckDto) {
  // 1. Validate user is TEACHER/ADMIN
  // 2. Create deck document
  // 3. Return deck object
}
```
- **Validate**: DTO, user role (TEACHER/ADMIN)
- **Create**: Tạo Deck document với `creatorId = userId`
- **Return**: Deck object (id, title, description, createdAt...)
- **Logging**: Log tạo deck thành công

---

### 2️⃣ Get User Decks
📍 **API:** `GET /management/vocab/decks`

#### Frontend Task
- **Query Setup**: `useQuery(['myDecks'], fetchMyDecks)` với caching
- **Display**: Render list với card count, edit/delete buttons
- **Refresh**: Trigger refresh on component mount or manual click
- **Pagination**: Handle paginated list if needed

#### Backend Task
- **Fetch**: Query tất cả Deck where `creatorId = userId`
- **Include**: Đính kèm card count cho mỗi deck
- **Sort**: Mới nhất trước (`createdAt DESC`)
- **Response**: Array of `{ id, title, description, cardCount, createdAt }`

---

### 3️⃣ Get Deck Details
📍 **API:** `GET /management/vocab/decks/:id`

#### Frontend Task
- **Load**: Fetch deck + cards khi user vào trang manage details
- **Display**: 
  - Deck metadata (title, description, levelTag)
  - Cards table with word, phonetic, meanings
  - Edit/Delete controls per card
- **State**: Store cards in local state, handle loading/error

#### Backend Task
- **Validate**: Ownership (deck.creatorId === userId) hoặc ADMIN
- **Fetch**: Include all cards dùng `.include({ cards: true })`
- **Return**: 
  ```json
  {
    "id": "...",
    "title": "...",
    "cards": [
      {
        "id": "...",
        "word": "...",
        "meanings": [...]
      }
    ]
  }
  ```

---

### 4️⃣ Update Deck Metadata
📍 **API:** `PATCH /management/vocab/decks/:id`

#### Frontend Task
- **Collect**: Form values (title, description, levelTag)
- **Validate**: Zod schema
- **Call**: Mutation với loading state
- **UI**: Toast + redirect on success

#### Backend Task
- **Validate**: Ownership check
- **Update**: `prisma.deck.update()` with partial fields
- **Return**: Updated deck object
- **Logging**: Log changes

---

### 5️⃣ Delete Deck
📍 **API:** `DELETE /management/vocab/decks/:id`

#### Frontend Task
- **Confirm**: Show delete confirmation modal
- **Call**: Mutation
- **Cleanup**: Remove from cache, redirect to deck list
- **Toast**: Success/error message

#### Backend Task
- **Transaction**:
  ```typescript
  await prisma.$transaction([
    // 1. Delete all cards in deck
    prisma.card.deleteMany({ where: { deckId } }),
    // 2. Delete deck
    prisma.deck.delete({ where: { id } }),
    // 3. Recalculate userStats
    updateUserStats(userId)
  ]);
  ```
- **Stats Recalc**: 
  - Count remaining cards per user
  - Update `totalWords`, `learnedWords`, `masteredWords`
- **Response**: `{ success: true, message: "Deck deleted" }`

---

### 6️⃣ Update Deck Public Status
📍 **API:** `PATCH /management/vocab/decks/:id/status`

#### Frontend Task
- **Toggle**: isPublic switch on deck settings
- **Optimistic**: Update UI immediately
- **Toast**: Confirm or error

#### Backend Task
- **Update**: `prisma.deck.update({ isPublic: boolean })`
- **Return**: Updated deck

---

### 7️⃣ Add Card Manually
📍 **API:** `POST /management/vocab/decks/:id/cards`

#### Frontend Task
- **Form**: CardForm component with fields (word, phonetic, meanings)
- **Validate**: Zod schema  
- **Call**: Mutation
- **Toast**: Success/error
- **Refresh**: Invalid cards list

#### Backend Task
- **Validate**:
  - deckId exists & belongs to user
  - word not duplicate for this deck
- **Create**: 
  ```typescript
  const newCard = await prisma.card.create({
    data: {
      word, phonetic, meanings,
      userId, deckId,
      status: CardStatus.NEW,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: now()
    }
  });
  ```
- **Update Stats**: `totalWords++` in userStats
- **Return**: Created card

---

### 8️⃣ Bulk Import (Auto-lookup)
📍 **API:** `POST /management/vocab/decks/:id/cards/auto-bulk`

#### Frontend Task
- **Input**: Textarea with list of words (one per line)
- **Validate**: Max 30 words
- **Show Progress**: Loading indicator during import
- **Toast**: "Successfully added X words"
- **Refresh**: Invalidate cards list

#### Backend Task
```typescript
async bulkImportCards(userId: string, deckId: string, words: string[]) {
  // 1. Validate deck ownership
  // 2. Get existing words for this deck to avoid duplicates
  // 3. For each new word:
  //    - Call external dictionary API (e.g., Oxford, Cambridge)
  //    - Extract: phonetic, audioUrl, meanings
  //    - Create card if not duplicate
  // 4. Update userStats
  // 5. Return: { success: true, addedCount: N }
}
```
- **External API Integration**: Lookup word data từ dictionary service
- **Error Handling**: Silently skip nếu lookup fails (không throw)
- **Duplicate Handling**: Kiểm tra `{ userId, word }` unique constraint
- **Batch Create**: `createMany()` for efficiency
- **Stats Update**: `totalWords += addedCount`

---

### 9️⃣ Update Card
📍 **API:** `PATCH /management/vocab/cards/:cardId`

#### Frontend Task
- **Form**: Edit card fields (word, meanings, etc.)
- **Validate**: Zod schema
- **Call**: Mutation
- **Toast**: Confirm change
- **Refresh**: Update local card state

#### Backend Task
- **Validate**: 
  - Card exists
  - User owns card (card.userId === userId)
  - No breaking duplicate word in same user
- **Update**: Partial update fields
- **Return**: Updated card

---

### 🔟 Delete Card
📍 **API:** `DELETE /management/vocab/cards/:cardId`

#### Frontend Task
- **Confirm**: Delete confirmation
- **Call**: Mutation
- **Remove**: From local list
- **Toast**: Success/error

#### Backend Task
- **Transaction**:
  ```typescript
  await prisma.$transaction([
    prisma.card.delete({ where: { id: cardId } }),
    // Recalculate stats based on card's old status
    updateUserStats(userId)
  ]);
  ```
- **Stats Recalc**: 
  - If card was MASTERED: `masteredWords--`
  - If card was not NEW: `learnedWords--`
  - Always: `totalWords--`
- **Response**: Success

---

### 1️⃣1️⃣ Deck Analytics
📍 **API:** `GET /management/vocab/decks/:id/analytics`

#### Frontend Task
- **Display**: Analytics dashboard with charts
  - Progress bar (masteredCards / totalCards %)
  - Status breakdown (NEW, LEARNING, REVIEW, MASTERED counts)
- **Caching**: Cache for 5 minutes (backend can cache too)

#### Backend Task
```typescript
async getDeckAnalytics(userId: string, deckId: string) {
  const cards = await prisma.card.findMany({
    where: { deckId },
    select: { status: true }
  });

  const counts = {
    total: cards.length,
    NEW: cards.filter(c => c.status === 'NEW').length,
    LEARNING: cards.filter(c => c.status === 'LEARNING').length,
    REVIEW: cards.filter(c => c.status === 'REVIEW').length,
    MASTERED: cards.filter(c => c.status === 'MASTERED').length,
  };

  return {
    totalCards: counts.total,
    masteredCards: counts.MASTERED,
    progress: (counts.MASTERED / counts.total * 100).toFixed(2) + '%'
  };
}
```

---

## 📖 Learner APIs (Review Flow)

### 1️⃣2️⃣ Public Decks List
📍 **API:** `GET /vocab/decks/public`

#### Frontend Task
- **Search & Filter**:
  - Search by title/description
  - Filter by difficulty level (tab selection)
  - Pagination
- **Display**: Grid/List of public decks
  - Card: title, description, difficulty, card count, teacher name
  - "Enroll" button
- **State**: Query with filters, pagination state

#### Backend Task
- **Query**: 
  ```typescript
  const decks = await prisma.deck.findMany({
    where: {
      isPublic: true,
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
      ...(tag && { levelTag: tag })
    },
    include: { creator: { select: { name: true } }, _count: { select: { cards: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit
  });
  ```
- **Pagination**: Return `{ items: [], meta: { total, page, lastPage } }`

---

### 1️⃣3️⃣ Deck Preview
📍 **API:** `GET /vocab/decks/:id/preview`

#### Frontend Task
- **Display**: 
  - Deck info (title, description, difficulty, card count)
  - First 5-10 cards preview
  - Teacher name
  - "Enroll" button (show if not enrolled)
- **Layout**: Modal or dedicated page

#### Backend Task
- **Fetch**: Deck with preview cards (limit 10)
- **Check**: `isPublic === true`
- **Return**: Deck with limited cards

---

### 1️⃣4️⃣ Enroll Deck
📍 **API:** `POST /vocab/decks/:id/enroll`

#### Frontend Task
- **Action**: User clicks "Enroll" button
- **Loading**: Show spinner during enrollment
- **Toast**: "Successfully enrolled! Start learning"
- **Redirect**: Navigate to learner's deck list or start lesson
- **Optimistic**: Add to enrolled list immediately

#### Backend Task
```typescript
async enrollDeck(userId: string, deckId: string) {
  // 1. Verify deck exists & is public
  const masterDeck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: true }
  });
  
  // 2. Get user's existing cards (words they already know)
  const userCards = await prisma.card.findMany({
    where: { userId },
    select: { word: true }
  });
  const existingWords = new Set(userCards.map(c => c.word));
  
  // 3. Filter new cards to add (only words not in user's collection)
  const newCards = masterDeck.cards.filter(
    card => !existingWords.has(card.word)
  );
  
  // 4. Bulk create new cards with SM-2 initial values
  await prisma.$transaction([
    prisma.card.createMany({
      data: newCards.map(card => ({
        word: card.word,
        phonetic: card.phonetic,
        audioUrl: card.audioUrl,
        meanings: card.meanings,
        userId,
        deckId,
        status: CardStatus.NEW,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: new Date()
      }))
    }),
    // 5. Update userStats
    updateUserStats(userId)
  ]);
  
  // 6. Return result
  return {
    message: `Enrolled! Added ${newCards.length} words.`,
    added: newCards.length
  };
}
```
- **Key Points**:
  - Silent duplicate handling (không throw error)
  - Fresh SM-2 initial state for new cards
  - Stats updated

---

### 1️⃣5️⃣ Unenroll Deck
📍 **API:** `DELETE /vocab/decks/:id/unenroll`

#### Frontend Task
- **Confirm**: Modal asking "Remove all words from this deck?"
- **Call**: Mutation
- **Remove**: From enrolled list
- **Toast**: Success

#### Backend Task
```typescript
async unenrollDeck(userId: string, deckId: string) {
  // 1. Get all cards from this deck owned by user
  const cards = await prisma.card.findMany({
    where: { userId, deckId },
    select: { id: true }
  });
  
  // 2. Delete cards
  // 3. Recalculate userStats
  
  return { success: true };
}
```

---

### 1️⃣6️⃣ Enrolled Decks
📍 **API:** `GET /vocab/decks/enrolled`

#### Frontend Task
- **Display**: List of decks user enrolled in
  - Deck name, progress (%)
  - Due cards count
  - "Study Now" button
- **Caching**: Refetch on page focus

#### Backend Task
```typescript
async getEnrolledDecks(userId: string) {
  return prisma.deck.findMany({
    where: {
      cards: {
        some: { userId }
      }
    },
    include: {
      cards: {
        where: { userId },
        select: { status: true, nextReview: true }
      }
    }
  }).then(decks => decks.map(deck => ({
    ...deck,
    cardCount: deck.cards.length,
    masteredCount: deck.cards.filter(c => c.status === 'MASTERED').length,
    dueCount: deck.cards.filter(c => c.nextReview <= new Date()).length
  })));
}
```

---

### 1️⃣7️⃣ Today's Due Cards Count
📍 **API:** `GET /vocab/reviews/today-count`

#### Frontend Task
- **Display**: Badge on navigation (e.g., "📚 5 due to review")
- **Polling**: Refetch every 5 minutes or on page focus
- **Toast**: Notify user if new due cards

#### Backend Task
```typescript
async getTodayDueCount(userId: string) {
  const count = await prisma.card.count({
    where: {
      userId,
      nextReview: { lte: new Date() }
    }
  });
  return { dueCount: count };
}
```

---

## 🎯 Review Session APIs (Core Learning)

### 1️⃣8️⃣ Start Review Session
📍 **API:** `POST /vocab/reviews/session/start`

#### Frontend Task
- **Action**: User clicks "Study Now" or on enrolled deck
- **Load**: Show loading spinner
- **Request Payload**:
  ```json
  {
    "deckId": "deck123"
  }
  ```
- **Display**: 
  - Flash cards with word on front, meaning on back
  - Rating buttons (1-5)
  - Progress indicator
  - Timer
- **Store**: `sessionId` locally for sync later

#### Backend Task
```typescript
async startSession(userId: string, deckId: string) {
  // 1. Find due cards (nextReview <= now) - limit 50
  const cards = await prisma.card.findMany({
    where: {
      userId,
      deckId,
      nextReview: { lte: new Date() }
    },
    take: 50
  });

  // 2. Create LearningSession document
  const session = await prisma.learningSession.create({
    data: {
      userId,
      deckId,
      startTime: new Date()
    }
  });

  // 3. Return cards + sessionId (without SM-2 sensitive data initially)
  return {
    sessionId: session.id,
    cards: cards.map(card => ({
      id: card.id,
      word: card.word,
      phonetic: card.phonetic,
      audioUrl: card.audioUrl,
      meanings: card.meanings
    }))
  };
}
```

---

### 🔑 **Frontend SM-2 Logic (During Review)**

**Frontend MUST handle SM-2 calculation before sending to backend:**

```typescript
// features/vocabulary/utils/srs-logic.ts

interface SM2Result {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: Date;
}

export function calculateSM2(
  currentCard: Card,
  userRating: number // 1-4 (or 1-5 depending on scale)
): SM2Result {
  let { interval, easeFactor, repetitions } = currentCard;

  // SM-2 Algorithm
  if (userRating < 3) {
    // User answered poorly
    repetitions = 0;
    interval = 1; // Review tomorrow
  } else {
    // User answered correct
    repetitions++;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update EF (Ease Factor)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - userRating) * (0.08 + (5 - userRating) * 0.02))
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReview
  };
}
```

**Frontend aggregates results during session:**

```typescript
// features/vocabulary/components/learning/review-session.tsx

const ReviewSession = ({ sessionId, cards: initialCards }) => {
  const [reviewResults, setReviewResults] = useState<ReviewResultDto[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    const card = initialCards[currentCardIndex];
    
    // ✅ Frontend: Calculate SM-2
    const sm2Result = calculateSM2(card, rating);

    // ✅ Frontend: Aggregate result
    setReviewResults(prev => [...prev, {
      cardId: card.id,
      status: determineStatus(sm2Result), // NEW->LEARNING->REVIEW->MASTERED
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      easeFactor: sm2Result.easeFactor,
      rating,
      nextReview: sm2Result.nextReview.toISOString()
    }]);

    // Move to next card
    if (currentCardIndex < initialCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      // Session complete - show complete screen
      showSessionComplete();
    }
  };

  const handleSessionComplete = () => {
    // ✅ Send aggregated JSON to backend
    syncSession({
      sessionId,
      deckId,
      results: reviewResults,
      minutesSpent: sessionMinutes
    });
  };
};
```

---

### 1️⃣9️⃣ Sync Session Results
📍 **API:** `POST /vocab/reviews/session/sync`

#### Frontend Task
- **Trigger**: User finishes session or manually saves
- **Payload**: Aggregated review results
  ```json
  {
    "sessionId": "session-123",
    "deckId": "deck-123",
    "results": [
      {
        "cardId": "card-1",
        "status": "LEARNING",
        "interval": 1,
        "repetitions": 1,
        "easeFactor": 2.5,
        "rating": 3,
        "nextReview": "2026-03-27T10:30:00Z"
      },
      // ... more results
    ],
    "minutesSpent": 15
  }
  ```
- **Validation**: Zod schema parsing
- **Success**: Show "Session saved!" & redirect

#### Backend Task
```typescript
async syncSession(userId: string, dto: SyncSessionDto) {
  // 1. Validate session exists & belongs to user
  const session = await prisma.learningSession.findUnique({
    where: { id: dto.sessionId },
  });
  if (session.userId !== userId) throw new UnauthorizedException();

  // 2. Batch update all cards based on review results
  const updatePromises = dto.results.map(result =>
    prisma.card.update({
      where: { id: result.cardId },
      data: {
        status: result.status,
        interval: result.interval,
        repetitions: result.repetitions,
        easeFactor: result.easeFactor,
        lastRating: result.rating,
        lastReviewedAt: new Date(),
        nextReview: new Date(result.nextReview)
      }
    })
  );

  // 3. Update session with results
  const sessionUpdate = prisma.learningSession.update({
    where: { id: dto.sessionId },
    data: {
      endTime: new Date(),
      cardsProcessed: dto.results.length,
      minutesSpent: dto.minutesSpent || 0,
      rawResults: dto.results // Store full results for analytics
    }
  });

  // 4. Recalculate userStats
  const statsUpdate = updateUserStats(userId);

  // 5. Execute all in transaction
  await prisma.$transaction([
    ...updatePromises,
    sessionUpdate,
    statsUpdate
  ]);

  return { success: true, message: 'Session synced successfully' };
}

async function updateUserStats(userId: string) {
  const cards = await prisma.card.findMany({
    where: { userId },
    select: { status: true }
  });

  return prisma.userStats.update({
    where: { userId },
    data: {
      learnedWords: cards.filter(c => c.status !== CardStatus.NEW).length,
      masteredWords: cards.filter(c => c.status === CardStatus.MASTERED).length,
      totalReviews: {
        increment: cards.length // Every card reviewed = +1
      },
      lastStudyDate: new Date()
    }
  });
}
```

**Key Principles:**
- ✅ Frontend tính SM-2 一次 (once)
- ✅ Backend chỉ update, không tính lại
- ✅ Atomicity: All-or-nothing transaction
- ✅ Stats: Recalculated from card data, not incremental

---

### 2️⃣0️⃣ Cancel Session
📍 **API:** `PATCH /vocab/reviews/session/:id/cancel`

#### Frontend Task
- **Action**: User exits session early without saving
- **Confirm**: "Discard all changes?"
- **Call**: Mutation
- **Navigate**: Back to deck list

#### Backend Task
```typescript
async cancelSession(userId: string, sessionId: string) {
  // 1. Validate session ownership
  // 2. Update LearningSession.endTime = now (but don't process results)
  // 3. Return success
  
  await prisma.learningSession.update({
    where: { id: sessionId },
    data: { endTime: new Date() }
  });

  return { success: true };
}
```

---

## 📊 Analytics APIs

### 2️⃣1️⃣ Dashboard Stats
📍 **API:** `GET /vocab/dashboard/stats`

#### Frontend Task
- **Display**: 
  - Total words learned
  - Words in learning phase
  - Mastered words (%)
  - Total review count
  - Streak indicator
- **Caching**: Cache for 10 minutes

#### Backend Task
```typescript
async getDashboardStats(userId: string) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
    select: {
      totalWords,
      learnedWords,
      masteredWords,
      totalReviews
    }
  });

  return {
    totalWords: stats.totalWords,
    learnedWords: stats.learnedWords,
    masteredWords: stats.masteredWords,
    totalReviews: stats.totalReviews,
    masteryRate: stats.totalWords > 0 
      ? ((stats.masteredWords / stats.totalWords) * 100).toFixed(1) + '%'
      : '0%'
  };
}
```

---

### 2️⃣2️⃣ Review Forecast
📍 **API:** `GET /vocab/reviews/forecast`

#### Frontend Task
- **Display**: Bar chart showing cards due in next 30 days
- **Caching**: Cache 1 hour
- **Update**: Refresh after session sync

#### Backend Task
```typescript
async getReviewForecast(userId: string) {
  // Get next 30 days of due cards
  const forecast: Record<string, number> = {};

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const count = await prisma.card.count({
      where: {
        userId,
        nextReview: {
          gte: date,
          lt: new Date(date.getTime() + 86400000) // End of day
        }
      }
    });

    if (count > 0) forecast[dateStr] = count;
  }

  return forecast; // { "2026-03-27": 5, "2026-03-28": 3, ... }
}
```

---

### 2️⃣3️⃣ Learning Heatmap
📍 **API:** `GET /vocab/dashboard/heatmap`

#### Frontend Task
- **Display**: GitHub-style heatmap showing daily study activity
- **Tooltip**: Hover shows "X cards on YYYY-MM-DD"
- **Caching**: Cache 1 hour

#### Backend Task
```typescript
async getLearningHeatmap(userId: string) {
  // Get last 365 days of learning activity
  const last365days = new Date();
  last365days.setDate(last365days.getDate() - 365);

  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      startTime: { gte: last365days }
    },
    select: { startTime: true, cardsProcessed: true }
  });

  // Aggregate by date
  const heatmap: Record<string, number> = {};

  sessions.forEach(session => {
    const dateStr = session.startTime.toISOString().split('T')[0];
    heatmap[dateStr] = (heatmap[dateStr] || 0) + session.cardsProcessed;
  });

  return heatmap; // { "2026-03-26": 30, "2026-03-25": 15, ... }
}
```

---

## 📝 Summary: Frontend vs Backend Responsibilities

| Task                    | Frontend                     | Backend                       |
| ----------------------- | ---------------------------- | ----------------------------- |
| **SM-2 Calculation**    | ✅ Calculate (during session) | ❌ Validate only               |
| **User Interaction**    | ✅ Capture ratings (1-4)      | ❌ Not involved                |
| **Session Aggregation** | ✅ Collect all card results   | ❌ Not involved                |
| **State Management**    | ✅ Local state + React Query  | ❌ Not involved                |
| **Result Validation**   | ✅ Client-side schema check   | ✅ Server-side DTO validation  |
| **Database Updates**    | ❌ Not involved               | ✅ Update cards + session      |
| **Stats Aggregation**   | ❌ Display only               | ✅ Recalculate from DB         |
| **Caching**             | ✅ React Query cache          | ✅ Redis/CDN optional          |
| **Error Handling**      | ✅ UI toast feedback          | ✅ Structured errors + logging |

---

## 🔄 Complete Request/Response Examples

### Example: Sync Session Sync (API #19)

**Frontend → Backend:**
```json
POST /vocab/reviews/session/sync
{
  "sessionId": "session-6789abc",
  "deckId": "deck-123xyz",
  "results": [
    {
      "cardId": "card-1",
      "status": "LEARNING",
      "interval": 1,
      "repetitions": 1,
      "easeFactor": 2.36,
      "rating": 3,
      "nextReview": "2026-03-27T14:30:00Z"
    },
    {
      "cardId": "card-2",
      "status": "REVIEW",
      "interval": 6,
      "repetitions": 4,
      "easeFactor": 2.45,
      "rating": 4,
      "nextReview": "2026-04-01T14:30:00Z"
    }
  ],
  "minutesSpent": 12
}
```

**Backend → Frontend:**
```json
{
  "success": true,
  "message": "Session synced successfully"
}
```

**Database State After:**
```
Card 1: status=LEARNING, nextReview=2026-03-27
Card 2: status=REVIEW, nextReview=2026-04-01
UserStats: learnedWords=2, totalReviews+=2
LearningSession: endTime=2026-03-26T14:42:00Z, cardsProcessed=2, minutesSpent=12
```

---

## ✅ Implementation Checklist

- [ ] **Frontend**: Implement `useReviewSession` hook with SM-2 logic
- [ ] **Frontend**: Create review-session.tsx component with rating buttons
- [ ] **Frontend**: Build session aggregation logic
- [ ] **Frontend**: Create sync mutation with error handling
- [ ] **Backend**: Implement `/vocab/reviews/session/start` endpoint
- [ ] **Backend**: Implement `/vocab/reviews/session/sync` endpoint with transaction
- [ ] **Backend**: Verify stats update logic
- [ ] **Backend**: Add logging for debugging
- [ ] **Backend**: Write unit tests for SM-2 validation
- [ ] **Database**: Verify indexes on `userId, nextReview` for performance
- [ ] **Both**: Add API documentation in Swagger/OpenAPI

