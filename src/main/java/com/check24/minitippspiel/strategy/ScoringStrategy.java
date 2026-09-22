package com.check24.minitippspiel.strategy;

import com.check24.minitippspiel.model.Prediction;

public interface ScoringStrategy {

    /**
     * Checks whether this strategy applies to the prediction vs actual match outcome.
     */
    boolean applies(int actualHome, int actualAway, int predHome, int predAway);

    /**
     * Calculates the points earned based on the strategy.
     */
    int calculatePoints();
}