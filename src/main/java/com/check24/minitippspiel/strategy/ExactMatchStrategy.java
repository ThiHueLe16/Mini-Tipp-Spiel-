package com.check24.minitippspiel.strategy;

import org.springframework.stereotype.Component;

@Component
public class ExactMatchStrategy implements ScoringStrategy {

    @Override
    public boolean applies(int actualHome, int actualAway, int predHome, int predAway) {
        return actualHome == predHome && actualAway == predAway;
    }

    @Override
    public int calculatePoints() {
        return 3;
    }
}