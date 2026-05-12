import {
  calculateSM2,
  calculateStreak,
} from '@modules/study/utils/sm2-algorithm';

describe('SM2 Algorithm', () => {
  const defaultPrevious = {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  };

  describe('calculateSM2', () => {
    describe('AGAIN rating (quality < 3)', () => {
      it('should reset repetitions to 0 and set interval to 1', () => {
        const result = calculateSM2('AGAIN', defaultPrevious);

        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
        expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
        expect(result.dueDate).toBeInstanceOf(Date);
      });

      it('should reset even after multiple successful reviews', () => {
        const previous = { easeFactor: 2.5, interval: 21, repetitions: 5 };
        const result = calculateSM2('AGAIN', previous);

        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
      });
    });

    describe('HARD rating (quality = 2)', () => {
      it('should reset repetitions and set interval to 1', () => {
        const result = calculateSM2('HARD', defaultPrevious);

        expect(result.repetitions).toBe(0);
        expect(result.interval).toBe(1);
      });
    });

    describe('GOOD rating (quality = 3)', () => {
      it('should set interval to 1 on first review', () => {
        const result = calculateSM2('GOOD', defaultPrevious);

        expect(result.repetitions).toBe(1);
        expect(result.interval).toBe(1);
      });

      it('should set interval to 6 on second review', () => {
        const previous = { easeFactor: 2.5, interval: 1, repetitions: 1 };
        const result = calculateSM2('GOOD', previous);

        expect(result.repetitions).toBe(2);
        expect(result.interval).toBe(6);
      });

      it('should multiply interval by ease factor on third review', () => {
        const previous = { easeFactor: 2.22, interval: 6, repetitions: 2 };
        const result = calculateSM2('GOOD', previous);

        expect(result.repetitions).toBe(3);
        // Uses previous easeFactor (2.22) before update
        // interval = Math.round(6 * 2.22) = Math.round(13.32) = 13
        expect(result.interval).toBe(13);
      });

      it('should increase interval progressively with multiple GOOD reviews', () => {
        let state = { easeFactor: 2.5, interval: 0, repetitions: 0 };

        // Review 1: GOOD
        state = calculateSM2('GOOD', state);
        expect(state.interval).toBe(1);
        expect(state.repetitions).toBe(1);

        // Review 2: GOOD
        state = calculateSM2('GOOD', state);
        expect(state.interval).toBe(6);
        expect(state.repetitions).toBe(2);

        // Review 3: GOOD
        state = calculateSM2('GOOD', state);
        // Uses previous easeFactor (2.22) before update
        // interval = Math.round(6 * 2.22) = Math.round(13.32) = 13
        expect(state.interval).toBe(13);
        expect(state.repetitions).toBe(3);

        // Review 4: GOOD
        state = calculateSM2('GOOD', state);
        // Uses previous easeFactor (2.08) before update
        // interval = Math.round(13 * 2.08) = Math.round(27.04) = 27
        expect(state.interval).toBe(27);
        expect(state.repetitions).toBe(4);
      });
    });

    describe('EASY rating (quality = 5)', () => {
      it('should set interval to 1 on first review', () => {
        const result = calculateSM2('EASY', defaultPrevious);

        expect(result.repetitions).toBe(1);
        expect(result.interval).toBe(1);
      });

      it('should increase ease factor significantly', () => {
        const result = calculateSM2('EASY', defaultPrevious);

        // EASY: quality=5, newEase = 2.5 + (0.1 - (5-5)*(0.08 + (5-5)*0.02)) = 2.5 + 0.1 = 2.6
        expect(result.easeFactor).toBe(2.6);
      });
    });

    describe('ease factor boundaries', () => {
      it('should not go below 1.3', () => {
        const lowEf = { easeFactor: 1.2, interval: 0, repetitions: 0 };
        const result = calculateSM2('AGAIN', lowEf);

        expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
      });

      it('should decrease ease factor on AGAIN', () => {
        const result = calculateSM2('AGAIN', defaultPrevious);

        // AGAIN: quality=0, newEase = 2.5 + (0.1 - 5*(0.08 + 5*0.02)) = 2.5 + (0.1 - 5*0.18) = 2.5 - 0.8 = 1.7
        expect(result.easeFactor).toBe(1.7);
      });
    });

    describe('dueDate calculation', () => {
      it('should set dueDate to today + interval days', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = calculateSM2('GOOD', defaultPrevious);

        const expectedDue = new Date(today);
        expectedDue.setDate(expectedDue.getDate() + 1);
        expect(result.dueDate.getTime()).toBe(expectedDue.getTime());
      });
    });
  });

  describe('calculateStreak', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    it('should return streak 1 if never studied before', () => {
      const result = calculateStreak(0, 0, null);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
    });

    it('should keep streak if already studied today', () => {
      const result = calculateStreak(5, 10, today);
      expect(result.currentStreak).toBe(5);
      expect(result.longestStreak).toBe(10);
    });

    it('should increment streak if studied yesterday', () => {
      const result = calculateStreak(5, 10, yesterday);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10);
    });

    it('should update longestStreak if new streak exceeds it', () => {
      const result = calculateStreak(5, 5, yesterday);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
    });

    it('should reset streak to 1 if last studied before yesterday', () => {
      const result = calculateStreak(5, 10, twoDaysAgo);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10);
    });

    it('should update longestStreak when resetting if current streak was the longest', () => {
      const result = calculateStreak(10, 10, twoDaysAgo);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10);
    });
  });
});
