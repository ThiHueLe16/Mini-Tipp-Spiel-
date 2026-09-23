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
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;

    @Transactional
    public Prediction submitPrediction(PredictionRequestDto dto) {
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + dto.userId()));

        Match match = matchRepository.findById(dto.matchId())
                .orElseThrow(() -> new IllegalArgumentException("Match not found: " + dto.matchId()));

        if (match.getKickoffTime().isBefore(Instant.now())) {
            throw new IllegalStateException("Cannot submit prediction after match kickoff!");
        }

        Prediction prediction = predictionRepository.findByUserIdAndMatchId(dto.userId(), dto.matchId())
                .orElseGet(() -> Prediction.builder().user(user).match(match).build());

        prediction.setPredictedHomeGoals(dto.predictedHomeGoals());
        prediction.setPredictedAwayGoals(dto.predictedAwayGoals());

        return predictionRepository.save(prediction);
    }

    // --- READ OPERATIONS ---

    @Transactional(readOnly = true)
    public List<Prediction> getPredictionsByUser(Long userId) {
        return predictionRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<Prediction> getPredictionsByMatch(Long matchId) {
        return predictionRepository.findByMatchId(matchId);
    }

    @Transactional(readOnly = true)
    public Optional<Prediction> getPredictionByUserAndMatch(Long userId, Long matchId) {
        return predictionRepository.findByUserIdAndMatchId(userId, matchId);
    }
}