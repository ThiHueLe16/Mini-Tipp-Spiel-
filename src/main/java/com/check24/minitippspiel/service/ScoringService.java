package com.check24.minitippspiel.service;

import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.model.Prediction;
import com.check24.minitippspiel.model.User;
import com.check24.minitippspiel.repository.MatchRepository;
import com.check24.minitippspiel.repository.PredictionRepository;
import com.check24.minitippspiel.repository.UserRepository;
import com.check24.minitippspiel.strategy.ScoringStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ScoringService {

    private final MatchRepository matchRepository;
    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;

    // Spring automatically injects all 3 concrete strategy beans here!
    private final List<ScoringStrategy> scoringStrategies;

    /**
     * Evaluates all predictions for a match once the final score is entered.
     */
    @Transactional
    public void evaluateMatch(Long matchId, int finalHomeGoals, int finalAwayGoals) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found with ID: " + matchId));

        if (match.isEvaluated()) {
            throw new IllegalStateException("Match has already been evaluated!");
        }

        // 1. Update match final score

        match.setFinalHomeGoals(finalHomeGoals);
        match.setFinalAwayGoals(finalAwayGoals);
        match.setEvaluated(true);
        matchRepository.save(match);

        // 2. Fetch all predictions submitted for this match
        List<Prediction> predictions = predictionRepository.findByMatchId(matchId);

        // 3. Evaluate each prediction against our strategies
        for (Prediction prediction : predictions) {
            int points = this.calculatePointsForPrediction(
                    finalHomeGoals, finalAwayGoals,
                    prediction.getPredictedHomeGoals(), prediction.getPredictedAwayGoals()
            );

            prediction.setPointsEarned(points);
            predictionRepository.save(prediction);

            // 4. Update the user's total leaderboard points
            User user = prediction.getUser();
            user.setTotalPoints(user.getTotalPoints() + points);
            userRepository.save(user);
        }
    }

    private int calculatePointsForPrediction(int actualHome, int actualAway, int predHome, int predAway) {
        for (ScoringStrategy strategy : scoringStrategies) {
            if (strategy.applies(actualHome, actualAway, predHome, predAway)) {
                return strategy.calculatePoints();
            }
        }
        return 0; // No strategy matched = incorrect prediction (0 points)
    }
}
