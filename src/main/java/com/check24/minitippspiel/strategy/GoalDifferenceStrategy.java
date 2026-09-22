package com.check24.minitippspiel.strategy;

import org.springframework.stereotype.Component;

@Component
public class GoalDifferenceStrategy implements ScoringStrategy {

    @Override
    public boolean applies(int actualHome, int actualAway, int predHome, int predAway) {
        // Must not be an exact match (ExactMatchStrategy takes precedence)
        boolean isExact = (actualHome == predHome && actualAway == predAway);

        // Correct goal difference (e.g., predicted 2:1, actual 3:2 -> diff is +1 for both)
        boolean sameDifference = (actualHome - actualAway) == (predHome - predAway);

        return !isExact && sameDifference;
    }

    @Override
    public int calculatePoints() {
        return 2;
    }
}