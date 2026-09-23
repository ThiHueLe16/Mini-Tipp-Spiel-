package com.check24.minitippspiel.controller;

import com.check24.minitippspiel.dto.PredictionRequestDto;
import com.check24.minitippspiel.model.Prediction;
import com.check24.minitippspiel.repository.PredictionRepository;
import com.check24.minitippspiel.service.PredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;
    private final PredictionRepository predictionRepository;

    @PostMapping
    public ResponseEntity<Prediction> submitPrediction(@RequestBody PredictionRequestDto dto) {
        Prediction prediction = predictionService.submitPrediction(dto);
        return ResponseEntity.ok(prediction);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Prediction>> getPredictionsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(predictionRepository.findByUserId(userId));
    }



    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<Prediction>> getPredictionsByMatch(@PathVariable Long matchId) {
        return ResponseEntity.ok(predictionRepository.findByMatchId(matchId));
    }

    @GetMapping("/user/{userId}/match/{matchId}")
    public ResponseEntity<Prediction> getPredictionByUserAndMatch(
            @PathVariable Long userId,
            @PathVariable Long matchId) {

        return predictionRepository.findByUserIdAndMatchId(userId, matchId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
