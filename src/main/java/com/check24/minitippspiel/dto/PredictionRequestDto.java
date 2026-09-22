package com.check24.minitippspiel.dto;

public record PredictionRequestDto(
        Long userId,
        Long matchId,
        int predictedHomeGoals,
        int predictedAwayGoals) {
}
