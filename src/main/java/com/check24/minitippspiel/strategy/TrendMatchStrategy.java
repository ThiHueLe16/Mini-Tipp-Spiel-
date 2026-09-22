package com.check24.minitippspiel.strategy;

import org.springframework.stereotype.Component;

@Component
public class TrendMatchStrategy implements ScoringStrategy {

    @Override
    public boolean applies(int actualHome, int actualAway, int predHome, int predAway) {
        int actualOutcome = Integer.compare(actualHome, actualAway); // 1 = Home win, 0 = Draw, -1 = Away win
        int predOutcome = Integer.compare(predHome, predAway);

        boolean isExact = (actualHome == predHome && actualAway == predAway);
        boolean sameDifference = (actualHome - actualAway) == (predHome - predAway);

        // Applies if correct winner/draw, but NOT exact match or goal difference
        return actualOutcome == predOutcome && !isExact && !sameDifference;
    }

    @Override
    public int calculatePoints() {
        return 1;
    }
}