package com.check24.minitippspiel.service;

import com.check24.minitippspiel.dto.PredictionRequestDto;
import com.check24.minitippspiel.model.Match;
import com.check24.minitippspiel.model.Prediction;
import com.check24.minitippspiel.model.User;
import com.check24.minitippspiel.repository.MatchRepository;
import com.check24.minitippspiel.repository.PredictionRepository;
import com.check24.minitippspiel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PredictionService {
    //this class handles saving user predictions

    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;

    @Transactional
    public Prediction submitPrediction(PredictionRequestDto dto) {
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + dto.userId()));

        Match match = matchRepository.findById(dto.matchId())
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + dto.matchId()));

        // Check if kickoff time has already passed
        if (match.getKickoffTime().isBefore(Instant.now())) {
            throw new IllegalStateException("Cannot submit prediction after match kickoff!");
        }

        // Upsert logic: Update existing prediction or create a new one
        Prediction prediction = predictionRepository.findByUserIdAndMatchId(dto.userId(), dto.matchId())
                .orElseGet(() -> Prediction.builder().user(user).match(match).build());

        prediction.setPredictedHomeGoals(dto.predictedHomeGoals());
        prediction.setPredictedAwayGoals(dto.predictedAwayGoals());

        return predictionRepository.save(prediction);
    }
}