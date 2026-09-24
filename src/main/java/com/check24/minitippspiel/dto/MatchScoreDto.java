package com.check24.minitippspiel.dto;

//Used when an Admin sets the final result after a match finishes.
public record MatchScoreDto(
        Integer finalHomeGoals,
        Integer finalAwayGoals
) {}